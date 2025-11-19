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
    DialogueSession, Stage, STTResult, TurnResult, SafetyCheckResult
)
from app.core.orchestrator import StageOrchestrator
from app.core.agent import DialogueAgent
from app.services.stt_service import STTService
from app.services.tts_service import get_tts_service
from app.tools.context_manager import get_context_manager
from app.services.redis_service import get_redis_service
from app.utils.name_utils import extract_first_name

router = APIRouter()
logger = logging.getLogger(__name__)

# 싱글톤 인스턴스
orchestrator = StageOrchestrator()
agent = DialogueAgent()
stt_service = STTService()
tts_service = get_tts_service()
context_manager = get_context_manager()
redis_service = get_redis_service()


@router.post("/turn", response_model=DialogueTurnResponse)
async def process_dialogue_turn(
    session_id: str = Form(...),
    stage: Stage = Form(...),
    audio_file: Optional[UploadFile] = File(None),
    child_text: Optional[str] = Form(None)
):
    """
    대화 턴 처리
    
    Spring Boot(BE)에서 호출하는 메인 엔드포인트
    
    Args:
        session_id: 세션 ID
        stage: 현재 Stage (S1~S5)
        audio_file: 오디오 파일 (.wav) - 우선순위 1
        child_text: 아동 발화 텍스트 (STT 변환된 텍스트) - 우선순위 2 (테스트용)
    
    Returns:
        DialogueTurnResponse: 처리 결과
    """
    start_time = time.time()
    
    try:
        logger.info(
            f"대화 턴 처리 시작: session={session_id}, "
            f"stage={stage.value}, "
            f"audio_file={'있음' if audio_file else '없음'}, "
            f"child_text={'있음' if child_text else '없음'}"
        )
        
        # 1. 세션 조회
        session = context_manager.get_session(session_id)
        if not session:
            logger.error(f"❌ 세션을 찾을 수 없습니다: {session_id}")
            raise HTTPException(
                status_code=404,
                detail=f"세션을 찾을 수 없습니다. /session/start를 먼저 호출하세요."
            )
        
        # 기존 세션: 세션의 current_stage를 사용 (Form의 stage와 다를 수 있음)
        logger.info(
            f"기존 세션 조회: {session_id}, "
            f"세션 Stage: {session.current_stage.value}, "
            f"Form Stage: {stage.value}"
        )
        # 세션의 current_stage를 사용하도록 stage 업데이트
        stage = session.current_stage
        
        # 2. STT 처리 (오디오 파일 또는 텍스트)
        if audio_file:
            # 오디오 파일이 있으면 STT 변환
            logger.info(f"📁 오디오 파일 수신: filename={audio_file.filename}, content_type={audio_file.content_type}")
            
            # 오디오 파일 읽기
            audio_data = await audio_file.read()
            logger.info(f"📁 오디오 파일 크기: {len(audio_data)} bytes")
            
            # STT 서비스로 변환
            try:
                stt_result = await stt_service.transcribe(audio_data, audio_file.filename)
                logger.info(f"🎙️ STT 변환 완료: text='{stt_result.text}', confidence={stt_result.confidence}")
            except Exception as e:
                logger.error(f"❌ STT 변환 실패: {e}")
                raise HTTPException(status_code=500, detail=f"STT 변환 실패: {e}")
        
        elif child_text:
            # 텍스트 직접 입력 (테스트용)
            logger.info(f"📥 텍스트 직접 입력: '{child_text}' (길이: {len(child_text)})")
            
            if not child_text.strip():
                logger.warning(f"⚠️ child_text가 비어있거나 공백만 있습니다: '{child_text}'")
            
            try:
                stt_result = STTResult(
                    text=child_text.strip() if child_text else "",
                    confidence=1.0,  # 텍스트 직접 입력이므로 신뢰도 100%
                    language="ko"
                )
            except Exception as e:
                logger.error(f"❌ STTResult 생성 실패: {e}")
                raise HTTPException(status_code=400, detail=f"STTResult 생성 실패: {e}")
        
        else:
            # 둘 다 없으면 에러
            logger.error("❌ audio_file과 child_text 둘 다 없습니다!")
            raise HTTPException(
                status_code=400,
                detail="audio_file 또는 child_text 중 하나는 필수입니다"
            )
        
        # STTResult 객체 생성 후 검증
        logger.info(f"📝 생성된 stt_result 객체: text='{stt_result.text}' (길이: {len(stt_result.text)}), confidence={stt_result.confidence}")
        
        logger.info(f"아동 발화: '{stt_result.text}' (길이: {len(stt_result.text)})")
        
        # 3. Request 객체 구성 (세션의 current_stage 사용)
        request = DialogueTurnRequest(
            session_id=session_id,
            stage=session.current_stage,  # 세션의 current_stage 사용
            story_name=session.story_name,
            # story_theme=session.story_theme,
            child_name=session.child_name,
            # child_age=session.child_age,
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
        old_retry_count = session.retry_count
        session = orchestrator.update_session_state(
            session, should_transition, turn_result
        )
        new_stage = session.current_stage
        new_retry_count = session.retry_count
        logger.info(f"🔍 세션 상태 업데이트: {old_stage.value} → {new_stage.value}, retry_count={old_retry_count} → {new_retry_count}")

        # 7. Stage 전환 실패 시 fallback 응답 재생성
        if not should_transition and new_retry_count > old_retry_count:
            logger.info(f"🔄 Fallback 응답 재생성: Stage={new_stage.value}, retry_count={new_retry_count}")
            fallback_response = agent.generate_fallback_response(
                session, new_stage, new_retry_count
            )
            # turn_result의 ai_response를 fallback 응답으로 교체
            turn_result["ai_response"] = fallback_response.dict()
            logger.info(f"🔄 Fallback 응답 적용: {fallback_response.text}")
        
        # 8. AI 응답을 TTS로 변환
        ai_response_dict = turn_result.get("ai_response", {})
        ai_text = ai_response_dict.get("text", "")
        
        if ai_text:
            try:
                logger.info(f"🎙️ TTS 변환 시작: '{ai_text[:50]}...'")
                tts_result = tts_service.text_to_speech(ai_text)
                
                # ai_response에 TTS 정보 추가 (Base64 인코딩된 오디오)
                ai_response_dict["tts_audio_base64"] = tts_result["audio_base64"]
                ai_response_dict["tts_url"] = tts_result["file_url"]  # 백업용
                ai_response_dict["duration_ms"] = tts_result["duration_ms"]
                turn_result["ai_response"] = ai_response_dict
                
                logger.info(f"🎙️ TTS 변환 완료: {tts_result['file_path']}, duration={tts_result['duration_ms']}ms, Base64 길이={len(tts_result['audio_base64'])}")
            except Exception as e:
                logger.error(f"❌ TTS 변환 실패: {e}")
                # TTS 실패해도 텍스트 응답은 제공
                ai_response_dict["tts_audio_base64"] = None
                ai_response_dict["tts_url"] = None
                ai_response_dict["duration_ms"] = None

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
        
        # turn_result에서 필요한 데이터 추출 및 변환
        stt_result_raw = turn_result.get("stt_result")
        safety_check_raw = turn_result.get("safety_check", {})
        ai_response_raw = turn_result.get("ai_response", {})
        
        # stt_result 처리 (None일 수 있음)
        if stt_result_raw is None:
            stt_result_dict = {
                "text": "",
                "confidence": 0.0,
                "language": "ko"
            }
        elif isinstance(stt_result_raw, dict):
            stt_result_dict = stt_result_raw
        else:
            # STTResult 객체인 경우
            if hasattr(stt_result_raw, 'model_dump'):
                stt_result_dict = stt_result_raw.model_dump()
            elif hasattr(stt_result_raw, 'dict'):
                stt_result_dict = stt_result_raw.dict()
            else:
                stt_result_dict = {
                    "text": getattr(stt_result_raw, "text", ""),
                    "confidence": getattr(stt_result_raw, "confidence", 0.0),
                    "language": getattr(stt_result_raw, "language", "ko")
                }
        
        # safety_check 처리
        if isinstance(safety_check_raw, dict):
            safety_check_dict = safety_check_raw
            # message 필드가 없으면 None으로 설정
            if "message" not in safety_check_dict:
                safety_check_dict["message"] = None
        else:
            # SafetyCheckResult 객체인 경우
            if hasattr(safety_check_raw, 'model_dump'):
                safety_check_dict = safety_check_raw.model_dump()
            elif hasattr(safety_check_raw, 'dict'):
                safety_check_dict = safety_check_raw.dict()
            else:
                safety_check_dict = {
                    "is_safe": getattr(safety_check_raw, "is_safe", True),
                    "flagged_categories": getattr(safety_check_raw, "flagged_categories", []),
                    "message": getattr(safety_check_raw, "message", None)
                }
        
        # ai_response 변환 (Base64 오디오 포함)
        if isinstance(ai_response_raw, dict):
            ai_response_formatted = {
                "text": ai_response_raw.get("text", ""),
                "tts_audio_base64": ai_response_raw.get("tts_audio_base64"),  # Base64 인코딩된 오디오
                "tts_audio": ai_response_raw.get("tts_url") if "tts_url" in ai_response_raw else None,  # 백업용 URL
                "duration_ms": ai_response_raw.get("duration_ms") if "duration_ms" in ai_response_raw else None
            }
        else:
            # AISpeech 객체인 경우
            if hasattr(ai_response_raw, 'model_dump'):
                ai_response_dict = ai_response_raw.model_dump()
                ai_response_formatted = {
                    "text": ai_response_dict.get("text", ""),
                    "tts_audio_base64": ai_response_dict.get("tts_audio_base64"),
                    "tts_audio": ai_response_dict.get("tts_url"),
                    "duration_ms": ai_response_dict.get("duration_ms")
                }
            elif hasattr(ai_response_raw, 'dict'):
                ai_response_dict = ai_response_raw.dict()
                ai_response_formatted = {
                    "text": ai_response_dict.get("text", ""),
                    "tts_audio_base64": ai_response_dict.get("tts_audio_base64"),
                    "tts_audio": ai_response_dict.get("tts_url"),
                    "duration_ms": ai_response_dict.get("duration_ms")
                }
            else:
                ai_response_formatted = {
                    "text": getattr(ai_response_raw, "text", ""),
                    "tts_audio_base64": getattr(ai_response_raw, "tts_audio_base64", None),
                    "tts_audio": getattr(ai_response_raw, "tts_url", None),
                    "duration_ms": getattr(ai_response_raw, "duration_ms", None)
                }
        
        # 모든 필드가 있는지 확인 (None이라도 필드가 있어야 함)
        if "tts_audio_base64" not in ai_response_formatted:
            ai_response_formatted["tts_audio_base64"] = None
        if "tts_audio" not in ai_response_formatted:
            ai_response_formatted["tts_audio"] = None
        if "duration_ms" not in ai_response_formatted:
            ai_response_formatted["duration_ms"] = None
        
        # TurnResult 생성
        turn_result_formatted = TurnResult(
            stt_result=STTResult(**stt_result_dict),
            safety_check=SafetyCheckResult(**safety_check_dict),
            ai_response=ai_response_formatted
        )
        
        response = DialogueTurnResponse(
            success=True,
            session_id=session_id,
            stage=old_stage,  # Stage enum을 문자열로 변환
            result=turn_result_formatted,
            next_stage=next_stage_value.value,  # Stage enum을 문자열로 변환
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
    child_age: Optional[int] = Form(None),
    intro: str = Form(...)
):
    """
    새 대화 세션 시작
    
    Returns:
        session_id, ai_intro (첫 발화)
    """
    try:
        # 세션 ID 생성
        session_id = str(uuid.uuid4())
        
        # 이름에서 성 제거 (이름만 추출)
        first_name = extract_first_name(child_name)
        logger.info(f"이름 변환: '{child_name}' → '{first_name}'")
        
        # 세션 생성
        session = DialogueSession(
            session_id=session_id,
            child_name=first_name,
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
        
        # AI 인트로 생성 (백엔드에서 전달받은 intro 사용)
        character_name = story_context["character_name"]
        ai_intro = f"{first_name}아, {intro}"
        
        # AI 인트로를 TTS로 변환
        ai_intro_audio_base64 = None
        ai_intro_audio = None
        intro_duration_ms = None
        try:
            logger.info(f"🎙️ 인트로 TTS 변환 시작: '{ai_intro[:50]}...'")
            tts_result = tts_service.text_to_speech(ai_intro)
            ai_intro_audio_base64 = tts_result["audio_base64"]
            ai_intro_audio = tts_result["file_url"]  # 백업용
            intro_duration_ms = tts_result["duration_ms"]
            logger.info(f"🎙️ 인트로 TTS 변환 완료: {tts_result['file_path']}, Base64 길이={len(tts_result['audio_base64'])}")
        except Exception as e:
            logger.error(f"❌ 인트로 TTS 변환 실패: {e}")
            # TTS 실패해도 텍스트는 제공
        
        logger.info(f"세션 시작: {session_id}, 동화={story_name}")
        
        return {
            "success": True,
            "session_id": session_id,
            "character_name": character_name,
            "ai_intro": ai_intro,
            "ai_intro_audio_base64": ai_intro_audio_base64,
            "ai_intro_audio": ai_intro_audio,
            "intro_duration_ms": intro_duration_ms,
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

