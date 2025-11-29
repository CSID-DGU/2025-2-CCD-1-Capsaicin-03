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
                    "retry_3": "자동으로 S2로 전환 (기본 감정: 중립)"
                },
                max_retry=3
            ),
            Stage.S2_ASK_REASON_EMOTION_1: StageConfig(
                stage=Stage.S2_ASK_REASON_EMOTION_1,
                required_tools=[
                    ToolType.CONTEXT_MANAGER,  # S1 감정 인출
                    ToolType.SAFETY_FILTER
                ],
                prompt_template="stage_S2_ASK_REASON_EMOTION_1",
                success_criteria="아동이 동화 캐릭터가 그런 감정을 느낀 이유를 설명",
                fallback_strategy={
                    "retry_1": "간단한 재질문 (왜 그런 감정을 느꼈을까?)",
                    "retry_2": "2지선다 질문 (혹시 ~해서? 아니면 ~해서?)",
                    "retry_3": "자동으로 S3로 전환"
                },
                max_retry=3
            ),
            Stage.S3_ASK_EXPERIENCE: StageConfig(
                stage=Stage.S3_ASK_EXPERIENCE,
                required_tools=[
                    ToolType.CONTEXT_MANAGER,  # S3 상황 인출
                    ToolType.SAFETY_FILTER  # 초안 생성
                ],
                prompt_template="stage_S3_ASK_EXPERIENCE",
                success_criteria="아동이 경험 유무(있다/없다)를 명확히 응답",
                fallback_strategy={
                    "retry_1": "경험 유무 재질문 (비슷한 일을 본 적이 있어?)",
                    "retry_2": "명확한 선택 유도 (본 적이 있으면 '있다', 없으면 '없다'고 말해줄래?)",
                    # 답변이 없거나 모호하면 '없다'로 간주하고 시나리오 모드(S4)로 이동
                    "retry_3": "자동으로 S4로 전환 (Default: 경험 없음으로 간주)" 
                },
                max_retry=3
            ),
            Stage.S4_REAL_WORLD_EMOTION: StageConfig(
                stage=Stage.S4_REAL_WORLD_EMOTION,
                required_tools=[
                    ToolType.CONTEXT_MANAGER,  # 동화 교훈 매칭
                    ToolType.SAFETY_FILTER
                ],
                prompt_template="stage_S4_REAL_WORLD_EMOTION",
                # 목표: 제시된 상황(새치기, 구경 등)에서의 감정을 추측해야 함
                success_criteria="아동이 상황에 적절한 감정을 대답함",
                fallback_strategy={
                    "retry_1": "상황 재설명 및 감정 질문 (그 친구 표정이 어땠을까?)",
                    "retry_2": "감정 선택지 제시 (화가 났을까? 슬펐을까?)",
                    "retry_3": "자동으로 S5로 전환 (감정 추론 건너뛰기)"
                },
                max_retry=3
            ),
            # [추가됨] S5: 감정 이유 묻기 2 (S2와 동일 로직, 다음은 S6)
            Stage.S5_ASK_REASON_EMOTION_2: StageConfig(
                stage=Stage.S5_ASK_REASON_EMOTION_2,
                required_tools=[
                    ToolType.CONTEXT_MANAGER,
                    ToolType.SAFETY_FILTER
                ],
                prompt_template="stage_S5_ASK_REASON_EMOTION_2",
                # 목표: S4에서 답한 감정의 이유(상황적 맥락)를 설명
                success_criteria="아동이 타인이 그런 감정을 느낀 이유를 설명함",
                fallback_strategy={
                    "retry_1": "이유 재질문 (어떤 일 때문에 그런 마음이 들었을까?)",
                    "retry_2": "상황 기반 힌트 제공 (친구가 밀어서 그랬을까? 게임을 못해서?)",
                    "retry_3": "자동으로 S6로 전환"
                },
                max_retry=3
            ),
            Stage.S6_ACTION_CARD: StageConfig(
                stage=Stage.S6_ACTION_CARD,
                required_tools=[
                    ToolType.CONTEXT_MANAGER,       # 전체 대화 로그
                    ToolType.ACTION_CARD_GENERATOR  # 최종 카드 생성
                ],
                prompt_template="stage_S6_ACTION_CARD",
                success_criteria="행동카드 자동 생성 및 대화 종료",
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
        
        logger.info(f"🔍 Stage 전환 판단 시작: {current_stage.value}, 재시도 횟수: {session.retry_count}/{config.max_retry}")
        
        # 1. 규칙 기반 성공 판단
        rule_based_success = self._check_rule_based_success(
            current_stage, current_result
        )
        
        # 2. LLM 기반 평가 (보조)
        llm_evaluation = agent_evaluation.get("success", False)
        logger.info(f"📊 평가 결과 - 규칙 기반: {rule_based_success}, LLM 평가: {llm_evaluation}")
        
        # 3. 최종 판단 (규칙 우선)
        if current_stage == Stage.S6_ACTION_CARD:
            logger.info(f"🏁 S6는 마지막 스테이지이므로 다음 Stage로 전환 없음")
            return False  # S6는 마지막 스테이지
        
        if rule_based_success:
            logger.info(f"✅ {current_stage.value} 성공: 다음 Stage로 전환")
            return True
        
        # 4. 재시도 카운트 확인
        # max_retry가 3일 때, 현재 retry_count가 2이면 (0, 1, 2 총 3번 시도함)
        # 이번이 마지막 기회였으므로 다음으로 넘어가야 합니다.
        if session.retry_count >= config.max_retry - 1:
            logger.warning(
                f"⚠️ {current_stage.value} 최대 재시도 도달 ({session.retry_count + 1}회 시도), "
                f"다음 Stage로 강제 전환"
            )
            return True  # 강제 전환

        # # 4. 재시도 카운트 확인
        # if session.retry_count >= config.max_retry:
        #     logger.warning(
        #         f"⚠️ {current_stage.value} 최대 재시도 초과 ({config.max_retry}회), "
        #         f"Stage 스킵"
        #     )
        #     return True  # 강제 전환

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
            stt_result = result.get("stt_result", {})
            text = stt_result.get("text", "") if isinstance(stt_result, dict) else ""
    
            happy_keywords = ["1", "일번", "일", "행복"]
            sad_keywords = ["2", "이번", "이", "슬픔"]
            angry_keywords = ["3", "삼번", "삼", "화남"]
            fear_keywords = ["4", "사번", "사", "무서움"]
            surprise_keywords = ["5", "오번", "오", "놀라움", "신기"]
            # S1: 감정이 분류되었는가?
            emotion_result = result.get("emotion_detected")
            
            # 안전 필터 감지 시 emotion_result가 None일 수 있음
            if emotion_result is None:
                logger.warning(f"❌ S1: emotion_result가 None입니다 (안전 필터 감지 등)")
                return False
            if emotion_result.get("primary") != EmotionLabel.NEUTRAL:
                logger.info(emotion_result.get("primary"))
                return True
            
            if any(keyword in text for keyword in happy_keywords):
                    logger.info(f"✅ S1 성공: 감정(행복) 키워드 발견")
                    return True
            if any(keyword in text for keyword in sad_keywords):
                    logger.info(f"✅ S1 성공: 감정(슬픔) 키워드 발견")
                    return True
            if any(keyword in text for keyword in angry_keywords):
                    logger.info(f"✅ S1 성공: 감정(화남) 키워드 발견")
                    return True
            if any(keyword in text for keyword in fear_keywords):
                    logger.info(f"✅ S1 성공: 감정(무서움) 키워드 발견")
                    return True
            if any(keyword in text for keyword in surprise_keywords):
                    logger.info(f"✅ S1 성공: 감정(놀라움) 키워드 발견")
                    return True
            else:
                return False
        
        elif stage == Stage.S2_ASK_REASON_EMOTION_1:
            # S2: 아이가 동화 캐릭터의 감정 원인을 설명했는가? (STT 텍스트 길이로 판단)
            stt_result = result.get("stt_result")
            if stt_result is None:
                logger.warning(f"❌ S2: stt_result가 None입니다")
                return False
            
            # stt_result가 dict인지 확인
            if isinstance(stt_result, dict):
                text = stt_result.get("text", "")
            else:
                logger.warning(f"❌ S2: stt_result가 dict가 아닙니다. 타입: {type(stt_result)}")
                return False
            
            text_length = len(text.strip())
            logger.info(f"🔍 S2 성공 조건 체크: 텍스트='{text}', 길이={text_length}")
            
            # 단순 응답 제외 ("음", "어", "글쎄" 등)
            short_responses = ["음", "어", "응", "글쎄", "몰라", "모르겠어"]
            text_lower = text.strip().lower()
            
            # 3자 이상이고 단순 응답이 아니면 성공
            if text_length >= 3 and text_lower not in short_responses:
                logger.info(f"✅ S2 성공: 의미 있는 답변 (길이: {text_length})")
                return True
            else:
                logger.info(f"❌ S2 실패: 답변이 너무 짧거나 단순 응답 ('{text}', 길이: {text_length})")
                return False
            
        elif stage == Stage.S3_ASK_EXPERIENCE:    
            
            # S3 성공 로직: 긍정/부정 답변 모두 '성공'으로 처리하여 S4로 진입시킴
            stt_result = result.get("stt_result")
            if stt_result is None:
                logger.warning(f"❌ S3: stt_result가 None입니다")
                return False
            
            if isinstance(stt_result, dict):
                text = stt_result.get("text", "").strip()
                text_lower = text.lower()
            else:
                logger.warning(f"❌ S3: stt_result가 dict가 아닙니다. 타입: {type(stt_result)}")
                return False
            text_length = len(text.strip())
            logger.info(f"🔍 S3 성공 조건 체크: 텍스트='{text}', 길이={text_length}")
            
            # 긍정 키워드
            positive_keywords = ["있어", "봤어", "응", "네", "기억나", "경험", "적", "친구", "엄마", "아빠"]
            # 부정 키워드 (이 답변도 S4 예시 설명을 위해 성공으로 간주)
            negative_keywords = ["없어", "아니", "몰라", "없었어", "기억안나", "모르겠어", "본 적 없어"]
            
            has_positive = any(k in text_lower for k in positive_keywords)
            has_negative = any(k in text_lower for k in negative_keywords)
            
            if has_positive:
                logger.info(f"✅ S3 성공: 긍정 경험 응답 감지")
                return True
            elif has_negative:
                logger.info(f"✅ S3 성공: 부정/없음 응답 감지 -> S4에서 예시 제시로 연결")
                return True
            elif text_length >= 5:
                # 키워드가 없어도 문장이 길면 경험 설명으로 간주
                logger.info(f"✅ S3 성공: 구체적 서술 감지")
                return True
            return False
            # # 2자 이상 발화면 성공으로 간주
            # if text_length >= 3:
            #     logger.info(f"✅ S3 성공: 텍스트 길이 {text_length} >= 3")
                
               
            #     if any(keyword in text for keyword in reason_keywords):
            #         logger.info(f"✅ S3 성공: 경험 키워드 발견")
            #         return True
            #     else:
            #         logger.info(f"❌ S3 실패: 경험 키워드 없음")
            #         return False
            # else:
            #     logger.info(f"❌ S3 실패: 텍스트 길이 {text_length} < 2")
            #     return False
            
        elif stage == Stage.S4_REAL_WORLD_EMOTION:
            # S3: 아이가 전략을 수락했는가?
            # S2에서 이미 경험을 설명했으므로, S3에서는 전략 수락/선택에 집중
            # 하지만 아이가 다시 경험을 말하거나 다른 응답을 해도 대화 참여로 간주 (S2와 유사한 관대한 기준)
            stt_result = result.get("stt_result")
            if stt_result is None:
                logger.warning(f"❌ S4: stt_result가 None입니다")
                return False
            
            if isinstance(stt_result, dict):
                text = stt_result.get("text", "").strip()
                text_lower = text.lower()
            else:
                logger.warning(f"❌ S4: stt_result가 dict가 아닙니다. 타입: {type(stt_result)}")
                return False
            
            text_length = len(text)
            logger.info(f"🔍 S4 성공 조건 체크: 텍스트='{text}' (길이: {text_length})")
            
            stt_result = result.get("stt_result", {})
            text = stt_result.get("text", "") if isinstance(stt_result, dict) else ""
            return len(text.strip()) >= 1 # 관대하게 판단
            
        # [추가됨] S5: S2와 동일한 성공 조건 로직 사용
        elif stage == Stage.S5_ASK_REASON_EMOTION_2:
            stt_result = result.get("stt_result")
            if stt_result is None:
                logger.warning(f"❌ S5: stt_result가 None입니다")
                return False
            
            if isinstance(stt_result, dict):
                text = stt_result.get("text", "")
            else:
                logger.warning(f"❌ S5: stt_result가 dict가 아닙니다. 타입: {type(stt_result)}")
                return False
            
            text_length = len(text.strip())
            logger.info(f"🔍 S5 성공 조건 체크: 텍스트='{text}', 길이={text_length}")
            
            short_responses = ["음", "어", "응", "글쎄", "몰라", "모르겠어"]
            text_lower = text.strip().lower()
            
            if text_length >= 3 and text_lower not in short_responses:
                logger.info(f"✅ S5 성공: 의미 있는 답변 (길이: {text_length})")
                return True
            else:
                logger.info(f"❌ S5 실패: 답변이 너무 짧거나 단순 응답 ('{text}', 길이: {text_length})")
                return False
                
        elif stage == Stage.S6_ACTION_CARD:
            # return True  # S5는 항상 성공으로 간주 (대화 종료)
        
            stt_result = result.get("stt_result")
            
            if isinstance(stt_result, dict):
                text = stt_result.get("text", "").strip()
                text_lower = text.lower()
            
            if text_lower:
                return True     
            # 1. 전략 수락 키워드 (명시적 수락)
            # acceptance_keywords = [
            #     "네", "좋아", "할게", "그럴게", "응", "해볼게", "해볼래", 
            #     "그렇게 할게", "해보자", "시도해볼게", "할래", "좋아요",
            #     "그럼 그렇게", "그렇게 하자", "그렇게 할래", "알겠어", "알겠어요", "알았어", "알았어요",
            #     "그렇게 해볼게", "해볼게요", "할게요", "그렇게 할게요"
            # ]
            
            # has_acceptance = any(keyword in text_lower for keyword in acceptance_keywords)
            
            # if has_acceptance:
            #     logger.info(f"✅ S5 성공: 행동카드 수락 키워드 발견")
            #     return True
        
        return False
    
    def get_next_stage(self, current_stage: Stage) -> Optional[Stage]:
        """다음 Stage 반환 (순차적)"""
        stage_order = [
            Stage.S1_EMOTION_LABELING,
            Stage.S2_ASK_REASON_EMOTION_1,
            Stage.S3_ASK_EXPERIENCE,
            Stage.S4_REAL_WORLD_EMOTION,
            Stage.S5_ASK_REASON_EMOTION_2,
            Stage.S6_ACTION_CARD
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
        # 1. S3 -> S4 전환 시점: 아이의 답변 성향(긍정/부정) 분석 및 저장
        if session.current_stage == Stage.S3_ASK_EXPERIENCE and should_transition:
            stt_result = result.get("stt_result", {})
            text = stt_result.get("text", "").strip()
            text_lower = text.lower()
            
            # S3 답변 성향 판단 (S4 발화 생성을 위해)
            negative_keywords = ["없어", "아니", "몰라", "없었어", "기억안나", "모르겠어"]
            has_negative = any(k in text_lower for k in negative_keywords)
            
            # session.context가 없다면 딕셔너리로 초기화 가정 (Pydantic 모델에 필드 필요)
            if not hasattr(session, "context") or session.context is None:
                session.context = {}
            
            if has_negative:
                session.context["s3_answer_type"] = "negative"
                logger.info("📝 S3 결과 기록: 부정(경험 없음) -> S4에서 예시 제시 예정")
            else:
                session.context["s3_answer_type"] = "positive"
                session.context["s3_answer_content"] = text  # 아이의 경험 내용 저장
                logger.info("📝 S3 결과 기록: 긍정(경험 있음) -> S4에서 공감 및 질문 예정")
                
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
            next_stage = self.get_next_stage(session.current_stage)
            if next_stage:
                # 현재 Stage 유지, 재시도 카운트 증가
                session.retry_count += 1
            else:
                session.is_active = False
                logger.info("✅ 대화 세션 종료 (S5 완료)")
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
        return not session.is_active or session.current_stage == Stage.S6_ACTION_CARD

