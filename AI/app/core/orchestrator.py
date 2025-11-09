"""
L1 Orchestrator: Workflow 관리
- S1 → S2 → S3 → S4 → S5 순차 진행
- 각 Stage별 필수 Tool 지정
- 전환 조건 판단
- Fallback 전략 실행
"""
from typing import Dict, List, Optional
from enum import Enum
import logging

from app.models.schemas import (
    Stage, DialogueTurnRequest, DialogueTurnResponse,
    StageConfig, ToolType, DialogueSession, EmotionLabel
)

logger = logging.getLogger(__name__)


class StageOrchestrator:
    """
    Workflow 관리자
    - Stage 순서 제어 (고정)
    - 각 Stage의 성공/실패 판단
    - 다음 Stage로 전환 결정
    """
    
    def __init__(self):
        self.stage_configs = self._initialize_stage_configs()
        
    def _initialize_stage_configs(self) -> Dict[Stage, StageConfig]:
        """각 Stage별 설정 정의"""
        return {
            Stage.S1_EMOTION_LABELING: StageConfig(
                stage=Stage.S1_EMOTION_LABELING,
                required_tools=[
                    ToolType.SAFETY_FILTER,
                    ToolType.EMOTION_CLASSIFIER
                ],
                prompt_template="stage_s1_emotion_labeling",
                success_criteria="아동이 감정 단어를 선택하거나 발화",
                fallback_strategy={
                    "retry_1": "개방형 질문 재시도",
                    "retry_2": "감정 선택지 3개 제시",
                    "retry_3": "Stage 스킵하고 S2로 전환 (기본 감정: 중립)"
                },
                max_retry=3
            ),
            Stage.S2_ASK_EXPERIENCE: StageConfig(
                stage=Stage.S2_ASK_EXPERIENCE,
                required_tools=[
                    ToolType.CONTEXT_MANAGER,  # S1 감정 인출
                    ToolType.SAFETY_FILTER
                ],
                prompt_template="stage_s2_ask_experience",
                success_criteria="아동이 원인/상황을 설명",
                fallback_strategy={
                    "retry_1": "예시 상황 제시",
                    "retry_2": "2지선다 질문 (혹시 ~였어? ~였어?)",
                    "retry_3": "Stage 스킵하고 S3로 전환"
                },
                max_retry=3
            ),
            Stage.S3_ACTION_SUGGESTION: StageConfig(
                stage=Stage.S3_ACTION_SUGGESTION,
                required_tools=[
                    ToolType.CONTEXT_MANAGER,  # S2 상황 인출
                    ToolType.ACTION_CARD_GENERATOR  # 초안 생성
                ],
                prompt_template="stage_s3_action_suggestion",
                success_criteria="아동이 전략을 선택하거나 수락",
                fallback_strategy={
                    "retry_1": "1개 전략 제안",
                    "retry_2": "2-3개 전략 카드 제시 후 선택 유도",
                    "retry_3": "기본 전략 제공 후 S4로 전환"
                },
                max_retry=3
            ),
            Stage.S4_LESSON_CONNECTION: StageConfig(
                stage=Stage.S4_LESSON_CONNECTION,
                required_tools=[
                    ToolType.CONTEXT_MANAGER  # 동화 교훈 매칭
                ],
                prompt_template="stage_s4_lesson_connection",
                success_criteria="아동이 '네/알겠어요' 응답",
                fallback_strategy={
                    "retry_1": "교훈 재진술",
                    "retry_2": "동화와 연결 강조",
                    "retry_3": "자동으로 S5로 전환"
                },
                max_retry=2  # 교훈은 빠르게 넘어감
            ),
            Stage.S5_ACTION_CARD: StageConfig(
                stage=Stage.S5_ACTION_CARD,
                required_tools=[
                    ToolType.CONTEXT_MANAGER,       # 전체 대화 로그
                    ToolType.ACTION_CARD_GENERATOR  # 최종 카드 생성
                ],
                prompt_template="stage_s5_action_card",
                success_criteria="행동카드 자동 생성 (아동 응답 불필요)",
                fallback_strategy={
                    "retry_1": "기본 템플릿으로 카드 생성",
                    "retry_2": "카드 생성 실패 알림"
                },
                max_retry=2
            )
        }
    
    def get_stage_config(self, stage: Stage) -> StageConfig:
        """Stage 설정 조회"""
        return self.stage_configs[stage]
    
    def should_transition_to_next_stage(
        self,
        session: DialogueSession,
        current_result: Dict,
        agent_evaluation: Dict
    ) -> bool:
        """
        다음 Stage로 전환해야 하는지 판단
        
        Args:
            session: 현재 세션
            current_result: 현재 턴의 처리 결과
            agent_evaluation: Agent(LLM)의 평가 결과
        
        Returns:
            True: 다음 Stage로 전환
            False: 현재 Stage 유지
        """
        current_stage = session.current_stage
        config = self.stage_configs[current_stage]
        
        # 1. 규칙 기반 성공 판단
        rule_based_success = self._check_rule_based_success(
            current_stage, current_result
        )
        
        # 2. LLM 기반 평가 (보조)
        llm_evaluation = agent_evaluation.get("success", False)
        
        # 3. 최종 판단 (규칙 우선)
        if rule_based_success:
            logger.info(f"✅ {current_stage.value} 성공: 다음 Stage로 전환")
            return True
        
        # 4. 재시도 카운트 확인
        if session.retry_count >= config.max_retry:
            logger.warning(
                f"⚠️ {current_stage.value} 최대 재시도 초과 ({config.max_retry}회), "
                f"Stage 스킵"
            )
            return True  # 강제 전환
        
        # 5. 현재 Stage 유지
        logger.info(
            f"🔄 {current_stage.value} 재시도 "
            f"({session.retry_count + 1}/{config.max_retry})"
        )
        return False
    
    def _check_rule_based_success(
        self, stage: Stage, result: Dict
    ) -> bool:
        """규칙 기반 성공 조건 체크"""
        
        if stage == Stage.S1_EMOTION_LABELING:
            # S1: 감정이 분류되었는가?
            emotion_result = result.get("emotion_detected")
            if emotion_result and emotion_result.get("primary"):
                return True
        
        elif stage == Stage.S2_ASK_EXPERIENCE:
            # S2: 아이가 원인을 설명했는가? (STT 텍스트 길이로 판단)
            stt_result = result.get("stt_result", {})
            logger.info(stt_result)
            text = stt_result.get("text", "")
            # 5자 이상 발화면 성공으로 간주
            if len(text.strip()) >= 3:
                return True
        
        elif stage == Stage.S3_ACTION_SUGGESTION:
            # S3: 아이가 전략을 수락했는가? (긍정 표현 검출)
            stt_result = result.get("stt_result", {})
            text = stt_result.get("text", "").lower()
            positive_keywords = ["네", "좋아", "할게", "그럴게", "응", "해볼게"]
            if any(keyword in text for keyword in positive_keywords):
                return True
        
        elif stage == Stage.S4_LESSON_CONNECTION:
            # S4: 아이가 수락했는가?
            stt_result = result.get("stt_result", {})
            text = stt_result.get("text", "").lower()
            positive_keywords = ["네", "알겠", "응"]
            if any(keyword in text for keyword in positive_keywords):
                return True
        
        elif stage == Stage.S5_ACTION_CARD:
            # S5: 행동카드가 생성되었는가?
            action_card = result.get("action_card")
            if action_card and action_card.get("title"):
                return True
        
        return False
    
    def get_next_stage(self, current_stage: Stage) -> Optional[Stage]:
        """다음 Stage 반환 (순차적)"""
        stage_order = [
            Stage.S1_EMOTION_LABELING,
            Stage.S2_ASK_EXPERIENCE,
            Stage.S3_ACTION_SUGGESTION,
            Stage.S4_LESSON_CONNECTION,
            Stage.S5_ACTION_CARD
        ]
        
        try:
            current_idx = stage_order.index(current_stage)
            logger.info(f"현재 Stage: {current_idx}")
            if current_idx < len(stage_order) - 1:
                return stage_order[current_idx + 1]
            else:
                # S5가 마지막 → 세션 종료
                return None
        except ValueError:
            logger.error(f"알 수 없는 Stage: {current_stage}")
            return None
    
    def get_fallback_strategy(
        self, stage: Stage, retry_count: int
    ) -> Optional[str]:
        """현재 재시도 횟수에 따른 Fallback 전략 반환"""
        config = self.stage_configs[stage]
        fallback_key = f"retry_{retry_count}"
        return config.fallback_strategy.get(fallback_key)
    
    def update_session_state(
        self,
        session: DialogueSession,
        should_transition: bool,
        result: Dict
    ) -> DialogueSession:
        """세션 상태 업데이트"""
        
        if should_transition:
            # Stage 전환
            next_stage = self.get_next_stage(session.current_stage)
            if next_stage:
                session.current_stage = next_stage
                session.retry_count = 0  # 재시도 카운트 초기화
                logger.info(f"🎯 Stage 전환: {session.current_stage.value}")
            else:
                # 세션 종료
                session.is_active = False
                logger.info("✅ 대화 세션 종료 (S5 완료)")
        else:
            # 현재 Stage 유지, 재시도 카운트 증가
            session.retry_count += 1
        
        # 턴 증가
        session.current_turn += 1
        
        # 감정 히스토리 누적 (S1에서만)
        if session.current_stage == Stage.S1_EMOTION_LABELING:
            emotion = result.get("emotion_detected", {}).get("primary")
            if emotion:
                session.emotion_history.append(emotion)
        
        # 핵심 발화 저장
        stt_text = result.get("stt_result", {}).get("text")
        if stt_text:
            session.key_moments.append({
                "stage": session.current_stage.value,
                "turn": session.current_turn,
                "content": stt_text
            })
        
        return session
    
    def is_session_complete(self, session: DialogueSession) -> bool:
        """세션이 완료되었는지 확인"""
        return not session.is_active or session.current_stage == Stage.S5_ACTION_CARD

