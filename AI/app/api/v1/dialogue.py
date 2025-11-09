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

router = APIRouter()
logger = logging.getLogger(__name__)

# 싱글톤 인스턴스
orchestrator = StageOrchestrator()
agent = DialogueAgent()
stt_service = STTService()
context_manager = get_context_manager()


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
            logger.info(f"새 세션 생성: {session_id}")
        
        # 2. STT 결과 생성 (텍스트 직접 입력)
        stt_result = STTResult(
            text=child_text,
            confidence=1.0,  # 텍스트 직접 입력이므로 신뢰도 100%
            language="ko"
        )
        
        logger.info(f"아동 발화: {child_text}")
        
        # 3. Request 객체 구성
        request = DialogueTurnRequest(
            session_id=session_id,
            turn_number=turn_number,
            stage=stage,
            story_name=story_name,
            story_theme=story_theme,
            child_name=child_name,
            child_age=child_age,
            audio_file=None,
            previous_turns=[]  # 필요시 DB에서 조회
        )
        
        # 4. Agent 실행 (Tool 사용, AI 응답 생성)
        turn_result = agent.execute_stage_turn(
            request, session, stt_result
        )
        
        # 5. Orchestrator 평가 (Stage 전환 판단)
        agent_evaluation = agent.evaluate_turn_success(
            stage, turn_result, stt_result.text
        )
        
        should_transition = orchestrator.should_transition_to_next_stage(
            session, turn_result, agent_evaluation
        )
        logger.info(f"🔍 should_transition_to_next_stage 호출됨: {session.current_stage}")

        # 6. 세션 상태 업데이트
        session = orchestrator.update_session_state(
            session, should_transition, turn_result
        )
        logger.info(f"🔍 update_session_state 호출됨: {session.current_stage}")

        context_manager.save_session(session)
        
        # 7. 다음 Stage 결정
        if should_transition:
            next_stage = orchestrator.get_next_stage(stage)
            logger.info(next_stage)
            if next_stage:
                next_stage_value = next_stage
            else:
                # S5 완료 → 세션 종료
                next_stage_value = Stage.S5_ACTION_CARD
                session.is_active = False
        else:
            next_stage_value = stage  # 현재 Stage 유지
        
        # 8. 응답 구성
        processing_time = int((time.time() - start_time) * 1000)
        
        response = DialogueTurnResponse(
            success=True,
            session_id=session_id,
            turn_number=turn_number,
            stage=stage,
            result=turn_result,
            next_stage=next_stage_value,
            fallback_triggered=session.retry_count > 0,
            retry_count=session.retry_count,
            processing_time_ms=processing_time
        )
        
        logger.info(
            f"대화 턴 처리 완료: {processing_time}ms, "
            f"next_stage={next_stage_value.value}"
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

