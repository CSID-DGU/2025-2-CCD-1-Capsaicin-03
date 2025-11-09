"""
Dialogue API 엔드포인트
/api/v1/dialogue/turn
"""
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from typing import Optional
import logging
import time
import uuid

from app.models.schemas import (
    DialogueTurnRequest, DialogueTurnResponse, ErrorResponse,
    DialogueSession, Stage, STTResult
)
from app.core.orchestrator import StageOrchestrator
from app.core.agent import DialogueAgent
from app.services.stt_service import STTService
from app.tools.context_manager import get_context_manager
from app.services.redis_service import get_redis_service

router = APIRouter()
logger = logging.getLogger(__name__)

# 싱글톤 인스턴스
orchestrator = StageOrchestrator()
agent = DialogueAgent()
stt_service = STTService()
context_manager = get_context_manager()
redis_service = get_redis_service()


@router.post("/turn", response_model=DialogueTurnResponse)
async def process_dialogue_turn(
    session_id: str = Form(...),
    turn_number: int = Form(...),
    stage: Stage = Form(...),
    story_name: str = Form(...),
    story_theme: str = Form(""),
    child_name: str = Form(...),
    child_age: Optional[int] = Form(None),
    child_text: str = Form(...)
):
    """
    대화 턴 처리
    
    Spring Boot(BE)에서 호출하는 메인 엔드포인트
    
    Args:
        session_id: 세션 ID
        turn_number: 턴 번호
        stage: 현재 Stage (S1~S5)
        story_name: 동화 제목
        story_theme: 동화 주제
        child_name: 아동 이름
        child_age: 아동 나이
        child_text: 아동 발화 텍스트 (STT 변환된 텍스트)
    
    Returns:
        DialogueTurnResponse: 처리 결과
    """
    start_time = time.time()
    
    try:
        logger.info(
            f"대화 턴 처리 시작: session={session_id}, "
            f"turn={turn_number}, stage={stage.value}"
        )
        
        # 1. 세션 조회 또는 생성
        session = context_manager.get_session(session_id)
        if not session:
            # 새 세션 생성
            session = DialogueSession(
                session_id=session_id,
                child_name=child_name,
                story_name=story_name,
                current_stage=stage,
                current_turn=turn_number
            )
            context_manager.save_session(session)
            logger.info(f"새 세션 생성: {session_id}, Stage: {stage.value}")
        else:
            # 기존 세션: 세션의 current_stage를 사용 (Form의 stage와 다를 수 있음)
            logger.info(
                f"기존 세션 조회: {session_id}, "
                f"세션 Stage: {session.current_stage.value}, "
                f"Form Stage: {stage.value}"
            )
            # 세션의 current_stage를 사용하도록 stage 업데이트
            stage = session.current_stage
        
        # 2. STT 결과 생성 (텍스트 직접 입력)
        # child_text 검증
        if not child_text:
            logger.error(f"❌ child_text가 None입니다!")
            raise HTTPException(status_code=400, detail="child_text는 필수입니다")
        
        if not child_text.strip():
            logger.warning(f"⚠️ child_text가 비어있거나 공백만 있습니다: '{child_text}'")
            # 빈 텍스트도 허용 (재시도 가능)
        
        logger.info(f"📥 Form에서 받은 child_text: '{child_text}' (길이: {len(child_text)}, 타입: {type(child_text)})")
        logger.info(f"📥 child_text repr: {repr(child_text)}")
        
        try:
            stt_result = STTResult(
                text=child_text.strip() if child_text else "",  # 공백 제거
                confidence=1.0,  # 텍스트 직접 입력이므로 신뢰도 100%
                language="ko"
            )
        except Exception as e:
            logger.error(f"❌ STTResult 생성 실패: {e}")
            raise HTTPException(status_code=400, detail=f"STTResult 생성 실패: {e}")
        
        # STTResult 객체 생성 후 검증
        logger.info(f"📝 생성된 stt_result 객체: text='{stt_result.text}' (길이: {len(stt_result.text)}, 타입: {type(stt_result.text)})")
        
        # Pydantic v2에서는 model_dump() 사용, v1에서는 dict() 사용
        try:
            if hasattr(stt_result, 'model_dump'):
                stt_dict = stt_result.model_dump()
                logger.info(f"📝 stt_result.model_dump()={stt_dict}")
            else:
                stt_dict = stt_result.dict()
                logger.info(f"📝 stt_result.dict()={stt_dict}")
        except Exception as e:
            logger.error(f"❌ stt_result 직렬화 실패: {e}")
            # 기본값으로 dict 생성
            stt_dict = {"text": stt_result.text, "confidence": stt_result.confidence, "language": stt_result.language}
            logger.info(f"📝 수동 생성한 stt_dict={stt_dict}")
        
        logger.info(f"아동 발화: '{child_text}' (길이: {len(child_text)})")
        
        # 3. Request 객체 구성 (세션의 current_stage 사용)
        request = DialogueTurnRequest(
            session_id=session_id,
            turn_number=turn_number,
            stage=session.current_stage,  # 세션의 current_stage 사용
            story_name=story_name,
            story_theme=story_theme,
            child_name=child_name,
            child_age=child_age,
            audio_file=None,
            previous_turns=[]  # 필요시 DB에서 조회
        )
        
        # 4. Agent 실행 (Tool 사용, AI 응답 생성)
        logger.info(f"🔧 Agent 실행 시작: Stage={session.current_stage.value}")
        turn_result = agent.execute_stage_turn(
            request, session, stt_result
        )
        logger.info(f"🔧 Agent 실행 완료: turn_result.keys()={list(turn_result.keys())}")
        
        # turn_result의 stt_result 확인
        if "stt_result" in turn_result:
            stt_in_result = turn_result["stt_result"]
            if isinstance(stt_in_result, dict):
                stt_text = stt_in_result.get("text", "")
                logger.info(f"📝 turn_result.stt_result.text: '{stt_text}' (길이: {len(stt_text)})")
            else:
                logger.warning(f"⚠️ turn_result.stt_result가 dict가 아님: {type(stt_in_result)}")
        else:
            logger.error(f"❌ turn_result에 'stt_result' 키가 없음")
        
        # 5. Orchestrator 평가 (Stage 전환 판단)
        agent_evaluation = agent.evaluate_turn_success(
            session.current_stage, turn_result, stt_result.text
        )
        
        logger.info(f"🔍 Stage 전환 판단 시작: Stage={session.current_stage.value}")
        should_transition = orchestrator.should_transition_to_next_stage(
            session, turn_result, agent_evaluation
        )
        logger.info(f"🔍 Stage 전환 결정: {session.current_stage.value} → {'✅ 전환' if should_transition else '❌ 유지'}")

        # 6. 세션 상태 업데이트
        old_stage = session.current_stage
        session = orchestrator.update_session_state(
            session, should_transition, turn_result
        )
        new_stage = session.current_stage
        logger.info(f"🔍 세션 상태 업데이트: {old_stage.value} → {new_stage.value}, retry_count={session.retry_count}")

        context_manager.save_session(session)
        
        # 7. 다음 Stage 결정 (업데이트된 세션의 current_stage 사용)
        if should_transition:
            # 세션이 업데이트되었으므로 session.current_stage가 다음 스테이지
            next_stage_value = session.current_stage
            logger.info(f"✅ Stage 전환 완료: 다음 Stage = {next_stage_value.value}")
        else:
            # 현재 Stage 유지
            next_stage_value = session.current_stage
            logger.info(f"🔄 Stage 유지: 현재 Stage = {next_stage_value.value}, 재시도 {session.retry_count}/{orchestrator.get_stage_config(session.current_stage).max_retry}")
        
        # 8. 응답 구성
        processing_time = int((time.time() - start_time) * 1000)
        
        response = DialogueTurnResponse(
            success=True,
            session_id=session_id,
            turn_number=turn_number,
            stage=session.current_stage,  # 업데이트된 세션의 current_stage 사용
            result=turn_result,
            next_stage=next_stage_value,
            fallback_triggered=session.retry_count > 0,
            retry_count=session.retry_count,
            processing_time_ms=processing_time
        )
        
        logger.info(
            f"✅ 대화 턴 처리 완료: {processing_time}ms, "
            f"현재 Stage={session.current_stage.value}, "
            f"다음 Stage={next_stage_value.value}, "
            f"재시도={session.retry_count}"
        )
        
        return response
    
    except Exception as e:
        logger.error(f"대화 턴 처리 실패: {e}", exc_info=True)
        
        processing_time = int((time.time() - start_time) * 1000)
        
        raise HTTPException(
            status_code=500,
            detail={
                "success": False,
                "error": {
                    "code": "PROCESSING_ERROR",
                    "message": str(e),
                    "retry_strategy": "RETRY_WITH_SAME_STAGE",
                    "fallback_options": ["다시 한번 말해줄래?"]
                },
                "processing_time_ms": processing_time
            }
        )


@router.post("/session/start")
async def start_session(
    story_name: str = Form(...),
    child_name: str = Form(...),
    child_age: Optional[int] = Form(None)
):
    """
    새 대화 세션 시작
    
    Returns:
        session_id, ai_intro (첫 발화)
    """
    try:
        # 세션 ID 생성
        session_id = str(uuid.uuid4())
        
        # 세션 생성
        session = DialogueSession(
            session_id=session_id,
            child_name=child_name,
            story_name=story_name,
            current_stage=Stage.S1_EMOTION_LABELING,
            current_turn=1
        )
        context_manager.save_session(session)
        
        # 동화 정보 조회
        story_context = context_manager.get_story_context(story_name)
        if not story_context:
            raise HTTPException(
                status_code=404,
                detail=f"등록되지 않은 동화: {story_name}"
            )
        
        # AI 인트로 생성
        character_name = story_context["character_name"]
        intro = story_context["intro"]
        ai_intro = f"{child_name} 아(야), {intro}"
        
        logger.info(f"세션 시작: {session_id}, 동화={story_name}")
        
        return {
            "success": True,
            "session_id": session_id,
            "character_name": character_name,
            "ai_intro": ai_intro,
            "stage": Stage.S1_EMOTION_LABELING.value
        }
    
    except Exception as e:
        logger.error(f"세션 시작 실패: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/session/{session_id}")
async def get_session(session_id: str):
    """
    세션 정보 조회
    """
    session = context_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="세션을 찾을 수 없습니다")
    
    return {
        "success": True,
        "session": session.dict()
    }


@router.get("/stories")
async def list_stories():
    """
    등록된 동화 목록 조회
    """
    from app.tools.context_manager import SEL_CHARACTERS
    
    stories = []
    for name, context in SEL_CHARACTERS.items():
        stories.append({
            "story_name": name,
            "character_name": context["character_name"],
            "sel_skill": context["sel_skill"],
            "safe_tags": context.get("safe_tags", [])
        })
    
    return {
        "success": True,
        "stories": stories
    }


@router.get("/session/{session_id}/history")
async def get_conversation_history(session_id: str):
    """
    세션의 대화 히스토리 조회
    
    Returns:
        대화 내용 리스트 [{"stage": "S1", "turn": 1, "content": "..."}, ...]
    """
    try:
        history = redis_service.get_conversation_history(session_id)
        
        if not history:
            # 세션이 없거나 히스토리가 없는 경우
            session = context_manager.get_session(session_id)
            if not session:
                raise HTTPException(
                    status_code=404,
                    detail="세션을 찾을 수 없습니다"
                )
            history = []
        
        return {
            "success": True,
            "session_id": session_id,
            "conversation_history": history,
            "total_turns": len(history)
        }
    
    except ConnectionError as e:
        logger.error(f"Redis 연결 오류: {e}")
        raise HTTPException(
            status_code=503,
            detail={
                "error": "Redis 연결 실패",
                "message": str(e),
                "hint": "Redis 서버가 실행 중인지 확인하세요."
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"대화 히스토리 조회 실패: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/session/{session_id}/emotions")
async def get_emotion_history(session_id: str):
    """
    세션의 감정 히스토리 조회
    
    Returns:
        감정 라벨 리스트 ["행복", "슬픔", ...]
    """
    try:
        emotions = redis_service.get_emotion_history(session_id)
        
        if emotions is None:
            # 세션 확인
            session = context_manager.get_session(session_id)
            if not session:
                raise HTTPException(
                    status_code=404,
                    detail="세션을 찾을 수 없습니다"
                )
            emotions = []
        
        return {
            "success": True,
            "session_id": session_id,
            "emotion_history": emotions,
            "total_emotions": len(emotions)
        }
    
    except ConnectionError as e:
        logger.error(f"Redis 연결 오류: {e}")
        raise HTTPException(
            status_code=503,
            detail={
                "error": "Redis 연결 실패",
                "message": str(e),
                "hint": "Redis 서버가 실행 중인지 확인하세요."
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"감정 히스토리 조회 실패: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/session/{session_id}/full")
async def get_full_conversation(session_id: str):
    """
    세션의 전체 대화 정보 조회 (대화 내용 + 감정 + 세션 정보)
    
    Returns:
        전체 대화 정보
    """
    try:
        full_data = redis_service.get_full_conversation(session_id)
        
        if not full_data:
            # 세션 확인
            session = context_manager.get_session(session_id)
            if not session:
                raise HTTPException(
                    status_code=404,
                    detail="세션을 찾을 수 없습니다"
                )
            # ContextManager에서 가져오기
            full_data = {
                "session_id": session.session_id,
                "child_name": session.child_name,
                "story_name": session.story_name,
                "current_stage": session.current_stage.value,
                "current_turn": session.current_turn,
                "conversation_history": session.key_moments,
                "emotion_history": [e.value for e in session.emotion_history],
                "created_at": session.created_at.isoformat() if session.created_at else "",
                "updated_at": session.updated_at.isoformat() if session.updated_at else "",
                "is_active": session.is_active
            }
        
        return {
            "success": True,
            **full_data
        }
    
    except ConnectionError as e:
        logger.error(f"Redis 연결 오류: {e}")
        raise HTTPException(
            status_code=503,
            detail={
                "error": "Redis 연결 실패",
                "message": str(e),
                "hint": "Redis 서버가 실행 중인지 확인하세요."
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"전체 대화 정보 조회 실패: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

