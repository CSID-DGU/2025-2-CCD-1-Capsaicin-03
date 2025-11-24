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
            Stage.S2_ASK_EXPERIENCE: StageConfig(
                stage=Stage.S2_ASK_EXPERIENCE,
                required_tools=[
                    ToolType.CONTEXT_MANAGER,  # S1 감정 인출
                    ToolType.SAFETY_FILTER
                ],
                prompt_template="stage_s2_ask_experience",
                success_criteria="아동이 동화 캐릭터가 그런 감정을 느낀 이유를 설명",
                fallback_strategy={
                    "retry_1": "간단한 재질문 (왜 그런 감정을 느꼈을까?)",
                    "retry_2": "2지선다 질문 (혹시 ~해서? 아니면 ~해서?)",
                    "retry_3": "자동으로 S3로 전환"
                },
                max_retry=3
            ),
            Stage.S3_ACTION_SUGGESTION: StageConfig(
                stage=Stage.S3_ACTION_SUGGESTION,
                required_tools=[
                    ToolType.CONTEXT_MANAGER,  # S3 상황 인출
                    ToolType.ACTION_CARD_GENERATOR  # 초안 생성
                ],
                prompt_template="stage_s3_action_suggestion",
                success_criteria="아동이 경험을 제시",
                fallback_strategy={
                    "retry_1": "간단한 재질문 (혹시 이런 경험이 있어?)",
                    "retry_2": "2지선다 질문 (혹시 ~했던 적이 있어? 아니면 ~했어?)",
                    "retry_3": "자동으로 S4로 전환"
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
                    "retry_1": "전략 3개 재진술",
                    "retry_2": "전략 2개 진술",
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
        
        logger.info(f"🔍 Stage 전환 판단 시작: {current_stage.value}, 재시도 횟수: {session.retry_count}/{config.max_retry}")
        
        # 1. 규칙 기반 성공 판단
        rule_based_success = self._check_rule_based_success(
            current_stage, current_result
        )
        
        # 2. LLM 기반 평가 (보조)
        llm_evaluation = agent_evaluation.get("success", False)
        logger.info(f"📊 평가 결과 - 규칙 기반: {rule_based_success}, LLM 평가: {llm_evaluation}")
        
        # 3. 최종 판단 (규칙 우선)
        if current_stage == Stage.S5_ACTION_CARD:
            logger.info(f"🏁 S5는 마지막 스테이지이므로 다음 Stage로 전환 없음")
            return False  # S5는 마지막 스테이지
        
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
            else:
                return False
        
        elif stage == Stage.S2_ASK_EXPERIENCE:
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
            
        elif stage == Stage.S3_ACTION_SUGGESTION:    
            
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
            
            reason_keywords = ["적", "있어", "경험", "응", "그래서", "친구", "엄마", "아빠", "부모"]
            
            # 2자 이상 발화면 성공으로 간주
            if text_length >= 3:
                logger.info(f"✅ S3 성공: 텍스트 길이 {text_length} >= 3")
                
               
                if any(keyword in text for keyword in reason_keywords):
                    logger.info(f"✅ S3 성공: 경험 키워드 발견")
                    return True
                else:
                    logger.info(f"❌ S3 실패: 경험 키워드 없음")
                    return False
            else:
                logger.info(f"❌ S3 실패: 텍스트 길이 {text_length} < 2")
                return False
            
        elif stage == Stage.S4_LESSON_CONNECTION:
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
                logger.warning(f"❌ S3: stt_result가 dict가 아닙니다. 타입: {type(stt_result)}")
                return False
            
            text_length = len(text)
            logger.info(f"🔍 S4 성공 조건 체크: 텍스트='{text}' (길이: {text_length})")
            
            # 1. 전략 수락 키워드 (명시적 수락)
            acceptance_keywords = [
                "네", "좋아", "할게", "그럴게", "응", "해볼게", "해볼래", 
                "그렇게 할게", "해보자", "시도해볼게", "할래", "좋아요",
                "그럼 그렇게", "그렇게 하자", "그렇게 할래", "알겠어", "알겠어요",
                "그렇게 해볼게", "해볼게요", "할게요", "그렇게 할게요"
            ]
            
            # 2. 전략 선택 키워드 (번호, 순서로 선택)
            selection_keywords = [
                "첫 번째", "첫번째", "1번", "하나", "첫번", "1",
                "둘째", "둘번째", "2번", "둘번", "2",
                "셋째", "셋번째", "3번", "셋번", "3",
                "이거", "저거", "그거", "이것", "저것", "그것",
                "이거 할래", "저거 할래", "그거 할래", "이거 해볼게",
                "이거 좋아", "저거 좋아", "그거 좋아"
            ]
            
            # 3. 전략 키워드 매칭 (전략 내용이 텍스트에 포함)
            strategies = result.get("strategies", [])
            strategy_mentioned = False
            strategy_keyword = None
            if strategies and isinstance(strategies, list):
                logger.info(f"🔍 S4: 전략 목록 확인 - {strategies}")
                # 전략 중 하나라도 텍스트에 포함되어 있으면 선택한 것으로 간주
                for strategy in strategies:
                    if strategy and isinstance(strategy, str):
                        # 전략의 핵심 키워드 추출 (동사, 명사 등)
                        strategy_words = strategy.split()
                        # 의미 있는 단어만 추출 (1글자 제외, 조사 제외)
                        meaningful_words = [
                            word for word in strategy_words 
                            if len(word) > 1 and word not in ["을", "를", "이", "가", "은", "는", "의", "에", "에서"]
                        ]
                        # 전략의 앞 2-3개 단어 확인
                        for keyword in meaningful_words[:3]:
                            if keyword in text:
                                strategy_mentioned = True
                                strategy_keyword = keyword
                                logger.info(f"🔍 S4: 전략 키워드 발견 - '{strategy}' (매칭 키워드: '{keyword}')")
                                break
                        if strategy_mentioned:
                            break
            
            # 4. 성공 조건 판단
            has_acceptance = any(keyword in text_lower for keyword in acceptance_keywords)
            has_selection = any(keyword in text_lower for keyword in selection_keywords)
            has_strategy_mention = strategy_mentioned
            
            # 5. S2와 유사한 관대한 기준: 의미 있는 응답 (경험 재언급 등도 허용)
            # S2에서 이미 경험을 말했으므로, S3에서 다시 말하거나 다른 응답을 해도 대화 참여로 간주
            # 단, 너무 짧은 응답("음", "어" 등)은 제외
            short_responses = ["음", "어", "응", "네", "아", "그래", "아니", "몰라", "모르겠어"]
            
            # 무의미한 반복 문자 체크 (예: "아아ㅏ", "으으으", "ㅋㅋㅋ" 등)
            # 같은 문자가 2번 이상 반복되면 무의미한 응답으로 간주
            unique_chars = set(text)
            is_repetitive = len(unique_chars) <= 2 and len(text) >= 3
            
            # 자음/모음만 있는지 체크 (예: "ㅏㅏㅏ", "ㄱㄱㄱ")
            korean_consonants = "ㄱㄴㄷㄹㅁㅂㅅㅇㅈㅊㅋㅌㅍㅎ"
            korean_vowels = "ㅏㅑㅓㅕㅗㅛㅜㅠㅡㅣ"
            is_only_jamo = all(c in korean_consonants + korean_vowels or c == ' ' for c in text)
            
            is_meaningful_response = (
                text_length >= 3 and 
                text not in short_responses and
                text_lower not in [s.lower() for s in short_responses] and
                not is_repetitive and  # 반복 문자 제외
                not is_only_jamo  # 자음/모음만 있는 것 제외
            )
            
            logger.info(
                f"🔍 S4 평가: "
                f"수락키워드={has_acceptance}, "
                f"선택키워드={has_selection}, "
                f"전략언급={has_strategy_mention}{f' (키워드: {strategy_keyword})' if strategy_keyword else ''}, "
                f"의미있는응답={is_meaningful_response} (길이: {text_length})"
            )
            
            # 성공 조건 우선순위:
            # 1. 명시적 수락/선택 (가장 확실)
            # 2. 전략 키워드 언급 (전략을 이해하고 언급)
            # 3. 의미 있는 응답 (대화 참여, S2와 유사한 관대한 기준)
            if has_acceptance:
                logger.info(f"✅ S4 성공: 전략 수락 키워드 발견")
                return True
            elif has_selection:
                logger.info(f"✅ S4 성공: 전략 선택 키워드 발견")
                return True
            elif has_strategy_mention:
                logger.info(f"✅ S4 성공: 전략 키워드 언급 발견")
                return True
            elif is_meaningful_response:
                # S2에서 이미 경험을 말했으므로, S3에서 의미 있는 응답이면 대화 참여로 간주
                logger.info(f"✅ S4 성공: 의미 있는 응답 (길이: {text_length} >= 2, S2와 유사한 관대한 기준)")
                return True
            else:
                logger.info(f"❌ S4 실패: 모든 조건 불만족 (길이: {text_length})")
                return False
        
        # elif stage == Stage.S4_LESSON_CONNECTION:
        #     # S4: 아이가 수락했는가?
        #     stt_result = result.get("stt_result")
        #     if stt_result is None:
        #         logger.warning(f"❌ S4: stt_result가 None입니다")
        #         return False
            
        #     if isinstance(stt_result, dict):
        #         text = stt_result.get("text", "").lower()
        #     else:
        #         logger.warning(f"❌ S4: stt_result가 dict가 아닙니다. 타입: {type(stt_result)}")
        #         return False
            
        #     positive_keywords = ["네", "알겠", "응", "할래", "싶어"]
        #     logger.info(f"🔍 S4 성공 조건 체크: 텍스트='{text}', 키워드={positive_keywords}")
        #     if any(keyword in text for keyword in positive_keywords):
        #         logger.info(f"✅ S4 성공: 긍정 키워드 발견")
        #         return True
        #     else:
        #         logger.info(f"❌ S4 실패: 긍정 키워드 없음")
        #         return False
        
        elif stage == Stage.S5_ACTION_CARD:
            # return True  # S5는 항상 성공으로 간주 (대화 종료)
        
            stt_result = result.get("stt_result")
            
            if isinstance(stt_result, dict):
                text = stt_result.get("text", "").strip()
                text_lower = text.lower()
            
            if text_length:
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

