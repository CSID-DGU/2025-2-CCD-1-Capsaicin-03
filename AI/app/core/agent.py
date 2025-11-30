"""
L2 Agent: LLM 기반 Tool 실행 및 평가
- Tool 실행 (Orchestrator가 지정한 Tool)
- 결과 평가
- 대화 생성
- Fallback 전략 실행
"""
from http import client
from typing import Dict, List, Optional
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
import logging
import os

from app.models.schemas import (
    Stage, DialogueTurnRequest, DialogueSession,
    STTResult, SafetyCheckResult, EmotionResult, AISpeech, ActionItems, EmotionLabel
)
from app.tools import (
    SafetyFilterTool,
    EmotionClassifierTool,
    ContextManagerTool,
    ActionCardGeneratorTool
)

logger = logging.getLogger(__name__)

class DialogueAgent:
    """
    대화 Agent (L2)
    - LLM을 사용해 Tool 실행 및 평가
    - Stage별 프롬프트에 따라 대화 생성
    - Fallback 전략 실행
    """
    
    def __init__(self, api_key: str = None):
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        self.llm = ChatOpenAI(
            model="gpt-4.1",
            temperature=0.7,
            api_key=self.api_key
        )
        
        # LLM 평가용 (낮은 temperature로 일관성 있는 평가)
        self.eval_llm = ChatOpenAI(
            model="gpt-4o-mini",
            temperature=0.3,
            api_key=self.api_key
        )
        
        # Tools 초기화
        self.safety_filter = SafetyFilterTool(api_key=self.api_key)
        self.emotion_classifier = EmotionClassifierTool()
        self.context_manager = ContextManagerTool()
        self.action_card_generator = ActionCardGeneratorTool(api_key=self.api_key)
        
        logger.info("DialogueAgent 초기화 완료")
    
    def execute_stage_turn(
        self,
        request: DialogueTurnRequest,
        session: DialogueSession,
        stt_result: STTResult
    ) -> Dict:
        """
        단일 턴 실행
        
        Args:
            request: 요청
            session: 세션
            stt_result: STT 결과
        
        Returns:
            턴 처리 결과 dict
        """
        stage = session.current_stage
        
        # stt_result 검증
        if stt_result is None:
            logger.error("❌ stt_result가 None입니다!")
            raise ValueError("stt_result가 None입니다")
        
        if not hasattr(stt_result, 'text'):
            logger.error(f"❌ stt_result에 'text' 속성이 없습니다. 타입: {type(stt_result)}")
            raise ValueError(f"stt_result에 'text' 속성이 없습니다")
        
        child_text = stt_result.text
        logger.info(f"🔍 execute_stage_turn: stt_result.text='{child_text}' (길이: {len(child_text) if child_text else 0})")
        logger.info(f"🔍 execute_stage_turn: stt_result 타입={type(stt_result)}")
        
        # Pydantic v2에서는 model_dump() 사용, v1에서는 dict() 사용
        try:
            if hasattr(stt_result, 'model_dump'):
                stt_dict = stt_result.model_dump()
                logger.info(f"🔍 execute_stage_turn: stt_result.model_dump()={stt_dict}")
            elif hasattr(stt_result, 'dict'):
                stt_dict = stt_result.dict()
                logger.info(f"🔍 execute_stage_turn: stt_result.dict()={stt_dict}")
            else:
                logger.warning(f"⚠️ stt_result에 dict() 또는 model_dump() 메서드가 없습니다")
        except Exception as e:
            logger.error(f"❌ stt_result 직렬화 실패: {e}")
        
        logger.info(f"Stage {stage.value} 턴 실행 시작")
        
        # 1. 안전 필터 (모든 Stage에서 실행)
        safety_result = self.safety_filter.check(child_text)
        
        if not safety_result.is_safe:
            logger.warning(f"안전 필터 감지: {safety_result.flagged_categories} - AI가 교육적으로 대응합니다")
            # 에러가 아닌 AI의 교육적 응답으로 처리
            return self._handle_safety_violation(safety_result, session, stage, stt_result)
            # return self._handle_safety_violation(safety_result, session, stage)
        
        # 2. Stage별 Tool 실행 및 대화 생성
        if stage == Stage.S1_EMOTION_LABELING:
            return self._execute_s1(request, session, child_text, stt_result)
        
        elif stage == Stage.S2_ASK_REASON_EMOTION_1:
            return self._execute_s2(request, session, child_text, stt_result)
        
        elif stage == Stage.S3_ASK_EXPERIENCE:
            return self._execute_s3(request, session, child_text, stt_result)
        
        elif stage == Stage.S4_REAL_WORLD_EMOTION:
            return self._execute_s4(request, session, child_text, stt_result)
        # [추가됨] S5: 감정 이유 묻기 2
        elif stage == Stage.S5_ASK_REASON_EMOTION_2:
            return self._execute_s5(request, session, child_text, stt_result)
        
        elif stage == Stage.S6_ACTION_CARD:
            return self._execute_s6(request, session, child_text, stt_result)
        
        else:
            logger.error(f"알 수 없는 Stage: {stage}")
            return {"error": "Unknown stage"}
    
    def _evaluate_child_answer_with_llm(
        self, stage: Stage, child_answer: str, session: DialogueSession, context: Dict
    ) -> Dict:
        """
        LLM 기반 답변 적절성 평가
        
        Args:
            stage: 현재 Stage
            child_answer: 아이의 답변
            session: 세션 정보
            context: 동화 컨텍스트
            
        Returns:
            {"success": bool, "reason": str}
        """
        if not child_answer or len(child_answer.strip()) < 2:
            logger.info(f"❌ LLM 평가: 답변이 너무 짧음 ('{child_answer}')")
            return {"success": False, "reason": "답변이 너무 짧음"}
        
        story = context.get("story", {})
        story_scene = story.get("scene", "")
        character_name = story.get("character_name", "캐릭터")
        
        # 이전 대화 기록 생성 (맥락 제공)
        conversation_history = ""
        if session.key_moments:
            conversation_history = "\n이전 대화 기록:\n"
            for moment in session.key_moments[-3:]:  # 최근 3개만
                conversation_history += f"- {moment['stage']}: {moment['content']}\n"
        
        # Stage별 평가 프롬프트
        if stage == Stage.S1_EMOTION_LABELING:
            question = f"{session.story_name} 동화에서 {character_name}가 어떤 감정을 느꼈을까?"
            evaluation_criteria = """
            평가 기준:
            - 감정 단어(행복, 슬픔, 화남, 무서움, 놀라움 등)를 말했는가?
            - 숫자(1번, 2번 등)로 감정을 선택했는가?
            - 표정이나 기분을 설명하려고 했는가?
            - "에베베베", "으아아" 같은 무의미한 소리는 실패
            - "몰라", "글쎄", "음" 같은 회피성 답변은 실패
            
            중요: 감정과 관련된 단어나 표현이 있으면 성공. 정확한 감정이 아니어도 감정을 표현하려 시도했다면 성공.
            """
        elif stage == Stage.S2_ASK_REASON_EMOTION_1:
            question = f"{session.story_name} 동화에서 {character_name}가 왜 그런 감정을 느꼈을까?"
            evaluation_criteria = f"""
            동화 장면: {story_scene}
            
            6살~9살 아이의 답변을 평가합니다. 아래 기준으로 평가하세요.
            
            [성공 조건]
            1. 동화 속 등장인물이나 상황을 언급했는가? (예: 새엄마, 언니, 혼자, 괴롭히다)
            2. 감정의 원인이나 이유를 말하려고 시도했는가?
            3. "해서", "때문에", "라서" 같은 이유 연결어를 사용했는가? 
            
            
            [성공 예시]
            - "새엄마가 괴롭히니까" → 성공 (동화 내용 + 이유)
            - "언니가 심술 부린다고 해서" → 성공 (동화 내용 + 이유)
            - "혼자 일해야 해서" → 성공 (동화 내용 + 이유)
            
            [실패 조건]
            - 감정 단어만 반복 (예: "심술했어", "화났어")
            - 동화와 완전히 무관한 말 (예: "초코", "쉐이크", "학교에서")
            - 무의미한 소리 (예: "에베베", "으아아")
            - 회피성 답변 (예: "몰라", "글쎄")
            
            중요: 아이가 동화 내용을 언급하면서 이유를 말하려 했다면 성공!

            """
        elif stage == Stage.S3_ASK_EXPERIENCE:
            question = "비슷한 경험이 있는지 물어봤을 때"
            evaluation_criteria = """
            - "있어", "없어" 같은 명확한 답변을 했는가?
            - 경험을 구체적으로 설명했는가?
            - 질문을 이해하고 대답하려고 시도했는가?
            """
        elif stage == Stage.S4_REAL_WORLD_EMOTION:
            question = "실생활 상황에서 그 사람이 어떤 감정이었을지 물어봤을 때"
            evaluation_criteria = """
            - 감정 단어(슬픔, 화남, 행복 등)를 말했는가?
            - 표정이나 기분을 설명하려고 했는가?
            - "몰라", "글쎄" 같은 회피성 답변이 아닌가?
            """
        elif stage == Stage.S5_ASK_REASON_EMOTION_2:
            question = "실생활 상황에서 그 사람이 왜 그런 감정을 느꼈을까?"
            evaluation_criteria = f"""
            S4 시나리오: {context.get('s4_scenario', '제시된 상황')}
            
            엄격하게 평가하세요. 아래 조건을 충족해야 성공입니다.
            
            [필수 조건]
            1. 답변이 감정의 이유를 설명해야 함 (해서, 때문에, 라서 등 사용)
            2. 제시된 상황과 연관된 이유여야 함
            3. 타인의 입장을 이해하려는 시도가 있어야 함
            4. 답변에 동화 속 등장인물 또는 상황이 언급되어 있어야 한다.
            - 예: 새엄마, 언니들, 왕자, 혼자, 구박, 잃어버려서 등
            5. 감정의 "이유"를 설명하는 연결어가 반드시 포함되어야 한다.
            - 예: "~해서", "~하니까", "~때문에", "~라서", "~어서", "왜냐면"
            6. 단순 감정 묘사가 아니라 원인을 설명하려는 의도가 있어야 한다.

            
            [즉시 실패 처리할 답변]
            - 감정 단어만 반복 (예: 슬펐어, 화났어)
            - 상황과 무관한 말 (예: 초코, 쉐이크, 동화 내용)
            - 무의미한 소리 (예: 에베베, 으아아)
            - 회피성 답변 (예: 몰라, 글쎄, 음)
            - 상황을 전혀 고려하지 않은 답변
            
            [판단 기준]
            - 감정 단어가 있더라도, "이유"가 없으면 반드시 실패로 판단하세요.
            - 동화 요소 + 이유 연결어 → 성공
            - 그 외 모든 경우 → 실패
            """
        else:
            logger.warning(f"❌ LLM 평가: 지원하지 않는 Stage {stage}")
            return {"success": False, "reason": f"지원하지 않는 Stage: {stage}"}
        
        prompt = ChatPromptTemplate.from_messages([
            ("system", f"""
            너는 6살~9살 아이의 답변을 평가하는 전문가야.
            
            {conversation_history}
            
            현재 질문: {question}
            아이의 답변: "{child_answer}"
            
            평가 기준:
            {evaluation_criteria}
            
            중요:
            1. 이전 대화 맥락을 고려하여 현재 답변이 질문과 관련성이 있는지 판단
            2. 답변의 길이가 아닌, 질문과의 맥락적 연관성을 중심으로 평가
            3. "에베베", "으아아", "ㅁㅁㅁ" 같은 무의미한 소리는 무조건 실패
            4. "몰라", "글쎄", "음", "어" 같은 회피성 단답은 실패
            5. 질문과 전혀 무관한 엉뚱한 이야기는 실패 (예: 감정 질문에 식사 이야기)
            6. 대화 흐름에서 벗어난 허무맹랑한 소리는 길어도 실패
            7. 짧더라도 질문에 직접적으로 관련된 답변이면 성공
            8. 동화 내용과 조금이라도 관련이 있고, 이유를 설명하려 시도했다면 성공
            9. 틀린 답변이어도 동화 내용 기반으로 설명했다면 성공
            
            출력 형식:
            - "성공" 또는 "실패" 한 단어만 출력
            """),
            ("user", "평가 결과를 '성공' 또는 '실패'로만 출력해.")
        ])
        
        try:
            response = self.eval_llm.invoke(prompt.format_messages())
            evaluation_result = response.content.strip()
            
            is_success = "성공" in evaluation_result
            logger.info(f"🤖 LLM 평가 ({stage.value}): '{child_answer}' → {evaluation_result}")
            
            return {
                "success": is_success,
                "reason": evaluation_result
            }
            
        except Exception as e:
            logger.error(f"❌ LLM 평가 실패: {e}")
            # LLM 평가 실패 시 기본 규칙으로 폴백
            fallback_success = len(child_answer) >= 3 and child_answer not in ["음", "어", "응", "글쎄", "몰라", "모르겠어"]
            return {
                "success": fallback_success,
                "reason": "LLM 평가 실패, 기본 규칙 사용"
            }
    
    ########################################## S1
    def _execute_s1(
        self, request: DialogueTurnRequest, session: DialogueSession, child_text: str, stt_result: STTResult
    ) -> Dict:
        """S1: 감정 라벨링"""
        logger.info("S1 실행: 감정 라벨링")
        
        # 컨텍스트 구성
        context = self.context_manager.build_context_for_prompt(
            session, Stage.S1_EMOTION_LABELING
        )
        
        # 1. 감정 분류 먼저 수행
        emotion_result = self.emotion_classifier.classify(child_text)
        logger.info(f"🔍 S1 감정 분류 결과: {emotion_result}")
        
        # 2. 규칙 기반 평가 (1차) - 감정 분류기만 사용
        rule_based_success = (emotion_result.primary != EmotionLabel.NEUTRAL)
        logger.info(f"🔍 S1 규칙 기반 평가: {rule_based_success} (emotion={emotion_result.primary})")
        
        # 3. LLM 기반 평가 (2차 - 규칙 기반 실패 시에만)
        if not rule_based_success:
            logger.info(f"🔍 S1 규칙 기반 실패 → LLM 평가 수행")
            llm_evaluation = self._evaluate_child_answer_with_llm(
                stage=Stage.S1_EMOTION_LABELING,
                child_answer=child_text,
                session=session,
                context=context
            )
            is_success = llm_evaluation.get("success", False)
            logger.info(f"🔍 S1 LLM 평가 결과: {is_success} - {llm_evaluation.get('reason', '')}")
        else:
            # 규칙 기반 성공 시 LLM 평가 생략
            is_success = True
            llm_evaluation = {"success": True, "reason": "규칙 기반 평가 통과"}
            logger.info(f"✅ S1 규칙 기반 성공 → LLM 평가 생략")
        
        # Max retry 체크: retry_count >= 2이고 성공하지 못했을 때만 전환 메시지
        if session.retry_count >= 2 and not is_success:
            logger.info(f"🔄 S1 max retry 도달 (retry_count={session.retry_count}), 자연스럽게 S2로 전환")
            ai_response = self._generate_s1_max_retry_transition(
                child_name=session.child_name,
                context=context
            )
            
            # stt_result 직렬화
            try:
                if hasattr(stt_result, 'model_dump'):
                    stt_dict = stt_result.model_dump()
                elif hasattr(stt_result, 'dict'):
                    stt_dict = stt_result.dict()
                else:
                    stt_dict = {
                        "text": getattr(stt_result, 'text', ''),
                        "confidence": getattr(stt_result, 'confidence', 1.0),
                        "language": getattr(stt_result, 'language', 'ko')
                    }
            except Exception as e:
                logger.error(f"❌ _execute_s1: stt_result 직렬화 실패: {e}")
                stt_dict = {
                    "text": getattr(stt_result, 'text', ''),
                    "confidence": getattr(stt_result, 'confidence', 1.0),
                    "language": getattr(stt_result, 'language', 'ko')
                }
            
            return {
                "stt_result": stt_dict,
                "safety_check": SafetyCheckResult(is_safe=True, flagged_categories=[]).dict(),
                "ai_response": ai_response.dict(),
                "action_items": ActionItems(
                    type="open_question",
                    instruction="다음 단계로 넘어가기"
                ).dict()
            }
        
        # 성공한 경우: 정상 AI 응답 생성
        # 3. AI 응답 생성 (일반 공감 응답)
        ai_response = self._generate_empathic_response(
            child_name=session.child_name,
            child_text=child_text,
            emotion=emotion_result.primary.value,
            context=context,
            stage=Stage.S1_EMOTION_LABELING
        )
        
        # 4. 액션 아이템 (감정 선택지)
        action_items = ActionItems(
            type="emotion_selection",
            options=[
                emotion_result.primary.value,
                *[e.value for e in emotion_result.secondary]
            ][:3],  # 최대 3개
            instruction=f"{session.child_name}아 어떤 기분이 들었을 것 같아?"
        )
        
        # stt_result 직렬화
        try:
            if hasattr(stt_result, 'model_dump'):
                stt_dict = stt_result.model_dump()
            elif hasattr(stt_result, 'dict'):
                stt_dict = stt_result.dict()
            else:
                stt_dict = {
                    "text": getattr(stt_result, 'text', ''),
                    "confidence": getattr(stt_result, 'confidence', 1.0),
                    "language": getattr(stt_result, 'language', 'ko')
                }
        except Exception as e:
            logger.error(f"❌ _execute_s1: stt_result 직렬화 실패: {e}")
            stt_dict = {
                "text": getattr(stt_result, 'text', ''),
                "confidence": getattr(stt_result, 'confidence', 1.0),
                "language": getattr(stt_result, 'language', 'ko')
            }
        
        return {
            "stt_result": stt_dict,
            "safety_check": SafetyCheckResult(is_safe=True, flagged_categories=[]).dict(),
            "emotion_detected": emotion_result.dict(),
            "ai_response": ai_response.dict(),
            "action_items": action_items.dict(),
            "llm_evaluation": llm_evaluation  # LLM 평가 결과 추가
        }

    ##################################### S2 #####################################
    def _execute_s2(
        self, request: DialogueTurnRequest, session: DialogueSession, child_text: str, stt_result: STTResult
    ) -> Dict:
        """S2: 원인 탐색"""
        logger.info("S2 실행: 감정 이유 탐색")
        
        # stt_result 검증 및 로깅
        if stt_result is None:
            logger.error("❌ _execute_s2: stt_result가 None입니다!")
            raise ValueError("stt_result가 None입니다")
        
        logger.info(f"🔍 _execute_s2: 받은 stt_result.text='{stt_result.text}' (길이: {len(stt_result.text) if stt_result.text else 0})")
        logger.info(f"🔍 _execute_s2: 받은 child_text='{child_text}' (길이: {len(child_text) if child_text else 0})")
        
        # 1. 컨텍스트 (S1에서 파악한 감정)
        context = self.context_manager.build_context_for_prompt(
            session, Stage.S2_ASK_REASON_EMOTION_1
        )
        
        # 2. LLM 기반 평가 (S2는 항상 LLM으로 평가 - 동화 내용 언급 여부가 중요)
        logger.info(f"🔍 S2 LLM 평가 수행 (동화 내용 연관성 체크)")
        llm_evaluation = self._evaluate_child_answer_with_llm(
            stage=Stage.S2_ASK_REASON_EMOTION_1,
            child_answer=child_text,
            session=session,
            context=context
        )
        is_success = llm_evaluation.get("success", False)
        logger.info(f"🔍 S2 LLM 평가 결과: {is_success} - {llm_evaluation.get('reason', '')}")
        
        # Max retry 체크: retry_count >= 2이고 성공하지 못했을 때만 전환 메시지
        if session.retry_count >= 2 and not is_success:
            logger.info(f"🔄 S2 max retry 도달 (retry_count={session.retry_count}), 자연스럽게 S3로 전환")
            ai_response = self._generate_s2_max_retry_transition(
                child_name=session.child_name,
                context=context
            )
            
            # stt_result 직렬화
            try:
                if hasattr(stt_result, 'model_dump'):
                    stt_dict = stt_result.model_dump()
                elif hasattr(stt_result, 'dict'):
                    stt_dict = stt_result.dict()
                else:
                    stt_dict = {
                        "text": getattr(stt_result, 'text', ''),
                        "confidence": getattr(stt_result, 'confidence', 1.0),
                        "language": getattr(stt_result, 'language', 'ko')
                    }
            except Exception as e:
                logger.error(f"❌ _execute_s2: stt_result 직렬화 실패: {e}")
                stt_dict = {
                    "text": getattr(stt_result, 'text', ''),
                    "confidence": getattr(stt_result, 'confidence', 1.0),
                    "language": getattr(stt_result, 'language', 'ko')
                }
            
            return {
                "stt_result": stt_dict,
                "safety_check": SafetyCheckResult(is_safe=True, flagged_categories=[]).dict(),
                "ai_response": ai_response.dict(),
                "action_items": ActionItems(
                    type="open_question",
                    instruction="다음 단계로 넘어가기"
                ).dict()
            }
        
        # stt_result 직렬화 (Pydantic v2는 model_dump(), v1은 dict())
        try:
            if hasattr(stt_result, 'model_dump'):
                stt_dict = stt_result.model_dump()
                logger.info(f"🔍 _execute_s2: stt_result.model_dump()={stt_dict}")
            elif hasattr(stt_result, 'dict'):
                stt_dict = stt_result.dict()
                logger.info(f"🔍 _execute_s2: stt_result.dict()={stt_dict}")
            else:
                # 수동으로 dict 생성
                stt_dict = {
                    "text": stt_result.text,
                    "confidence": getattr(stt_result, 'confidence', 1.0),
                    "language": getattr(stt_result, 'language', 'ko')
                }
                logger.warning(f"⚠️ _execute_s2: 수동으로 stt_dict 생성={stt_dict}")
        except Exception as e:
            logger.error(f"❌ _execute_s2: stt_result 직렬화 실패: {e}")
            # 수동으로 dict 생성
            stt_dict = {
                "text": getattr(stt_result, 'text', ''),
                "confidence": getattr(stt_result, 'confidence', 1.0),
                "language": getattr(stt_result, 'language', 'ko')
            }
            logger.warning(f"⚠️ _execute_s2: 예외 처리 후 수동으로 stt_dict 생성={stt_dict}")
        
        # 성공한 경우: 정상 AI 응답 생성
        # 3. AI 응답 생성
        if is_success:
            # 제대로 된 답변: 공감 + 비슷한 경험 질문
            ai_response = self._generate_s2_empathy_and_ask_experience(
                child_name=session.child_name,
                child_text=child_text,
                context=context
            )
        elif session.retry_count == 0:
            # retry_0: 초기 질문 - "왜 그런 감정이 들었을까?"
            ai_response = self._generate_ask_experience_question(
                child_name=session.child_name,
                context=context
            )
        elif session.retry_count == 1:
            # retry_1: 간단한 재질문
            ai_response = self._generate_s2_rc1(
                child_name=session.child_name,
                context=context
            )
        else:
            # retry_2: 2지선다 질문
            ai_response = self._generate_s2_rc2(
                story_name=session.story_name,
                child_name=session.child_name,
                context=context
            )
        # identified_emotion = context.get("identified_emotion", "감정")
        
        # 2. AI 응답 생성 (원인 탐색 질문)
        # ai_response = self._generate_ask_experience_question(
        #     child_name=session.child_name,
        #     # emotion=identified_emotion,
        #     context=context
        # )
        
        # 3. 액션 아이템 (개방형 질문)
        action_items = ActionItems(
            type="open_question",
            instruction="비슷한 경험이 있어?"
        )
        
        result_dict = {
            "stt_result": stt_dict,
            "safety_check": SafetyCheckResult(is_safe=True, flagged_categories=[]).dict(),
            "ai_response": ai_response.dict(),
            "action_items": action_items.dict(),
            "llm_evaluation": llm_evaluation  # LLM 평가 결과 추가
        }
        
        # 반환 전 최종 확인
        result_stt = result_dict.get("stt_result", {})
        result_text = result_stt.get("text", "") if isinstance(result_stt, dict) else ""
        logger.info(f"🔍 _execute_s2: 반환할 result_dict['stt_result']['text']='{result_text}' (길이: {len(result_text)})")
        
        return result_dict
    
    ##################################### S3 #####################################
    def _execute_s3(
        self, request: DialogueTurnRequest, session: DialogueSession, child_text: str, stt_result: STTResult
    ) -> Dict:
        """S3: 경험 질문"""
        logger.info("S3 실행: 경험 질문")
        
        # stt_result 검증 및 로깅
        if stt_result is None:
            logger.error("❌ _execute_s3: stt_result가 None입니다!")
            raise ValueError("stt_result가 None입니다")
        
        logger.info(f"🔍 _execute_s3: 받은 stt_result.text='{stt_result.text}' (길이: {len(stt_result.text) if stt_result.text else 0})")
        logger.info(f"🔍 _execute_s3: 받은 child_text='{child_text}' (길이: {len(child_text) if child_text else 0})")
        
        # 1. 컨텍스트 (S2에서 파악한 상황)
        context = self.context_manager.build_context_for_prompt(
            session, Stage.S3_ASK_EXPERIENCE
        )
        
        # 2. 규칙 기반 평가 (1차) - 명확한 긍정/부정 키워드만 체크
        text_lower = child_text.strip().lower()
        positive_keywords = ["있어", "봤어", "응", "네", "기억나", "경험", "적", "본적", "했어"]
        negative_keywords = ["없어", "아니", "없었어", "기억안나", "모르겠어", "본 적 없어", "못봤어"]
        has_positive = any(k in text_lower for k in positive_keywords)
        has_negative = any(k in text_lower for k in negative_keywords)
        rule_based_success = has_positive or has_negative
        logger.info(f"🔍 S3 규칙 기반 평가: {rule_based_success} (positive={has_positive}, negative={has_negative})")
        
        # 3. LLM 기반 평가 (2차 - 규칙 기반 실패 시에만)
        if not rule_based_success:
            logger.info(f"🔍 S3 규칙 기반 실패 → LLM 평가 수행")
            llm_evaluation = self._evaluate_child_answer_with_llm(
                stage=Stage.S3_ASK_EXPERIENCE,
                child_answer=child_text,
                session=session,
                context=context
            )
            is_success = llm_evaluation.get("success", False)
            logger.info(f"🔍 S3 LLM 평가 결과: {is_success} - {llm_evaluation.get('reason', '')}")
        else:
            is_success = True
            llm_evaluation = {"success": True, "reason": "규칙 기반 평가 통과"}
            logger.info(f"✅ S3 규칙 기반 성공 → LLM 평가 생략")
        
        # Max retry 체크: retry_count >= 2이고 성공하지 못했을 때만 전환 메시지
        if session.retry_count >= 2 and not is_success:
            logger.info(f"🔄 S3 max retry 도달 (retry_count={session.retry_count}), scenario_1로 전환")
            # max retry 도달 시 scenario_1 제시
            ai_response = self._generate_social_awareness_scenario_1(child_name=session.child_name, context=context)
            
            # stt_result 직렬화
            try:
                if hasattr(stt_result, 'model_dump'):
                    stt_dict = stt_result.model_dump()
                elif hasattr(stt_result, 'dict'):
                    stt_dict = stt_result.dict()
                else:
                    stt_dict = {
                        "text": getattr(stt_result, 'text', ''),
                        "confidence": getattr(stt_result, 'confidence', 1.0),
                        "language": getattr(stt_result, 'language', 'ko')
                    }
            except Exception as e:
                logger.error(f"❌ _execute_s3: stt_result 직렬화 실패: {e}")
                stt_dict = {
                    "text": getattr(stt_result, 'text', ''),
                    "confidence": getattr(stt_result, 'confidence', 1.0),
                    "language": getattr(stt_result, 'language', 'ko')
                }
            
            return {
                "stt_result": stt_dict,
                "safety_check": SafetyCheckResult(is_safe=True, flagged_categories=[]).dict(),
                "ai_response": ai_response.dict(),
                "action_items": ActionItems(
                    type="open_question",
                    instruction="다음 단계로 넘어가기"
                ).dict()
            }
        
        emotion = session.emotion_history[-1].value if session.emotion_history else "감정"
        situation = context.get("situation", child_text)
        
        logger.info(f"🔍 _execute_s3: emotion={emotion}, situation={situation}")
        
        # 2. 행동 전략 초안 생성
        # action_card는 context에서 가져오거나, story context에서 직접 조회
        story_context = self.context_manager.get_story_context(session.story_name)
        action_card_data = story_context.get("action_card", {}) if story_context else {}
        action_card_title = action_card_data.get("title") if isinstance(action_card_data, dict) else action_card_data
        
        strategies = self.action_card_generator.generate_draft(
            emotion=emotion,
            situation=situation,
            action_card=action_card_title or "감정 표현하기",
            child_name=session.child_name
        )
        
        logger.info(f"🔍 _execute_s3: 생성된 전략들={strategies}")
        
        # 아이의 현재 답변 평가
        text_length = len(child_text.strip()) if child_text else 0
        child_text_lower = child_text.strip().lower()
        
        # "없어", "없다", "없는데", "없음" 등 부정 답변 감지
        negative_responses = ["아니", "없어", "없다", "없는데", "없음", "없었어", "모르겠어", "몰라"]
        has_negative = any(neg in child_text_lower for neg in negative_responses)
        
        # "있어", "있다", "있었어" 등 긍정 답변 감지
        positive_responses = ["응", "있어", "있다", "있었어", "본 적", "했어", "했던"]
        # has_positive = any(pos in child_text_lower for pos in positive_responses) or text_length >= 5
        has_positive = (any(pos in child_text_lower for pos in positive_responses) or 
                        (not has_negative and text_length >= 5))
        
        story_context = self.context_manager.get_story_context(session.story_name)
        prompt_type = story_context.get("s3_prompt_type", "default") if story_context else "default"
        
        logger.info(f"🔍 S3 답변 분석: has_negative={has_negative}, has_positive={has_positive}, retry_count={session.retry_count}")
        
        # 3. AI 응답 생성
        if has_positive:
            # 경험이 있다고 함 -> S4로 넘어가서 구체적인 감정 묻기
            # (다음 턴에서 Orchestrator가 S4로 넘기도록 유도하는 응답)
            ai_response = self._generate_social_awareness_situation_summary(
                child_name=session.child_name,
                child_text=child_text,
                context=context
            )
            instruction = "그때 그 친구 기분은?"
            
        elif has_negative:
            # 경험이 없다고 함 -> 항상 scenario_1 제시
            ai_response = self._generate_social_awareness_scenario_1(child_name=session.child_name, context=context)
            instruction = "이야기 듣고 감정 맞추기"
            
        else:
            # 답변이 모호하거나, 재질문이 필요한 경우 (Retry)
            # 요청하신 멘트를 출력하여 경험 유무를 다시 묻습니다.
            story = context.get("story", {})
            character_name = story.get("character_name", "콩쥐")
            
            # 요청하신 멘트 적용
            retry_text = (
                f"너도 혹시 누가 힘들어서 울고 있거나 속상해하는 걸 본 적 있어? "
                f"{character_name}가 힘들어했잖아, 그런 것처럼 다른 사람이 속상해하는 걸 본 적이 있었을까?"
            )
            ai_response = AISpeech(text=retry_text)
            instruction = "경험 유무(있다/없다) 대답하기"

        # 4. 액션 아이템 (전략 선택 삭제 -> 개방형 질문으로 변경)
        action_items = ActionItems(
            type="open_question",
            instruction=instruction
        )
        
        # stt_result 직렬화
        try:
            if hasattr(stt_result, 'model_dump'):
                stt_dict = stt_result.model_dump()
            elif hasattr(stt_result, 'dict'):
                stt_dict = stt_result.dict()
            else:
                stt_dict = {
                    "text": getattr(stt_result, 'text', ''),
                    "confidence": getattr(stt_result, 'confidence', 1.0),
                    "language": getattr(stt_result, 'language', 'ko')
                }
        except Exception as e:
            logger.error(f"❌ _execute_s3: stt_result 직렬화 실패: {e}")
            stt_dict = {
                "text": getattr(stt_result, 'text', ''),
                "confidence": getattr(stt_result, 'confidence', 1.0),
                "language": getattr(stt_result, 'language', 'ko')
            }
        
        result_dict = {
            "stt_result": stt_dict,
            "safety_check": SafetyCheckResult(is_safe=True, flagged_categories=[]).dict(),
            "ai_response": ai_response.dict(),
            "action_items": action_items.dict(),
            "llm_evaluation": llm_evaluation  # LLM 평가 결과 추가
        }
        
        # 반환 전 최종 확인
        result_stt = result_dict.get("stt_result", {})
        result_text = result_stt.get("text", "") if isinstance(result_stt, dict) else ""
        logger.info(f"🔍 _execute_s3: 반환할 result_dict['stt_result']['text']='{result_text}' (길이: {len(result_text)})")
        
        return result_dict
    
    ##################################### S4 #####################################
    def _execute_s4(
        self, request: DialogueTurnRequest, session: DialogueSession, child_text: str, stt_result: STTResult
    ) -> Dict:
        """S4: 교훈 연결 + 행동카드 생성"""
        logger.info("S4 실행: 실생활 감정 라벨링")
        
        # 1. 컨텍스트 (동화 교훈)
        context = self.context_manager.build_context_for_prompt(
            session, Stage.S4_REAL_WORLD_EMOTION
        )
        
        # 2. 감정 분류 (S1과 동일)
        emotion_result = self.emotion_classifier.classify(child_text)
        logger.info(f"🔍 S4 감정 분류 결과: {emotion_result}")
        
        # 3. 규칙 기반 평가 (1차)
        happy_keywords = ["1", "1번", "일번", "일", "행복"]
        sad_keywords = ["2", "2번", "이번", "이", "슬픔"]
        angry_keywords = ["3", "3번", "삼번", "삼", "화남"]
        fear_keywords = ["4", "4번", "사번", "사", "무서움"]
        surprise_keywords = ["5", "5번", "오번", "오", "놀라움", "신기"]
        
        has_emotion_keyword = (
            any(k in child_text for k in happy_keywords) or
            any(k in child_text for k in sad_keywords) or
            any(k in child_text for k in angry_keywords) or
            any(k in child_text for k in fear_keywords) or
            any(k in child_text for k in surprise_keywords)
        )
        
        rule_based_success = (emotion_result.primary != EmotionLabel.NEUTRAL) or has_emotion_keyword
        logger.info(f"🔍 S4 규칙 기반 평가: {rule_based_success} (emotion={emotion_result.primary}, has_keyword={has_emotion_keyword})")
        
        # 4. LLM 기반 평가 (2차 - 규칙 기반 실패 시에만)
        if not rule_based_success:
            logger.info(f"🔍 S4 규칙 기반 실패 → LLM 평가 수행")
            llm_evaluation = self._evaluate_child_answer_with_llm(
                stage=Stage.S4_REAL_WORLD_EMOTION,
                child_answer=child_text,
                session=session,
                context=context
            )
            is_success = llm_evaluation.get("success", False)
            logger.info(f"🔍 S4 LLM 평가 결과: {is_success} - {llm_evaluation.get('reason', '')}")
        else:
            is_success = True
            llm_evaluation = {"success": True, "reason": "규칙 기반 평가 통과"}
            logger.info(f"✅ S4 규칙 기반 성공 → LLM 평가 생략")
        
        # Max retry 체크: retry_count >= 2이고 성공하지 못했을 때만 전환 메시지
        if session.retry_count >= 2 and not is_success:
            logger.info(f"🔄 S4 max retry 도달 (retry_count={session.retry_count}), 자연스럽게 S5로 전환")
            ai_response = self._generate_s4_max_retry_transition(
                child_name=session.child_name,
                context=context
            )
            
            # stt_result 직렬화
            try:
                if hasattr(stt_result, 'model_dump'):
                    stt_dict = stt_result.model_dump()
                elif hasattr(stt_result, 'dict'):
                    stt_dict = stt_result.dict()
                else:
                    stt_dict = {
                        "text": getattr(stt_result, 'text', ''),
                        "confidence": getattr(stt_result, 'confidence', 1.0),
                        "language": getattr(stt_result, 'language', 'ko')
                    }
            except Exception as e:
                logger.error(f"❌ _execute_s4: stt_result 직렬화 실패: {e}")
                stt_dict = {
                    "text": getattr(stt_result, 'text', ''),
                    "confidence": getattr(stt_result, 'confidence', 1.0),
                    "language": getattr(stt_result, 'language', 'ko')
                }
            
            return {
                "stt_result": stt_dict,
                "safety_check": SafetyCheckResult(is_safe=True, flagged_categories=[]).dict(),
                "ai_response": ai_response.dict(),
                "action_items": ActionItems(
                    type="open_question",
                    instruction="다음 단계로 넘어가기"
                ).dict()
            }
        
        # 성공한 경우: 정상 처리
        # S4 초기 진입 시 (retry_count=0): 아이가 말한 경험을 바탕으로 감정 질문
        if session.retry_count == 0:
            # S3에서 아이가 말한 경험 내용 가져오기
            s3_answer_content = session.context.get('s3_answer_content', '') if hasattr(session, 'context') and session.context else ''
            
            logger.info(f"🔍 S4 초기 진입: s3_answer_content='{s3_answer_content[:50] if s3_answer_content else '없음'}...'")
            
            # 아이가 말한 경험을 정리하고 그 상황 속 친구의 감정 질문
            ai_response = self._generate_social_awareness_situation_summary(
                child_name=session.child_name,
                child_text=s3_answer_content or child_text,
                context=context
            )
        else:
            # retry 중: 일반 공감 응답
            ai_response = self._generate_empathic_response(
                child_name=session.child_name,
                child_text=child_text,
                emotion=emotion_result.primary.value,
                context=context,
                stage=Stage.S4_REAL_WORLD_EMOTION
            )
        
        # S4에서 제시한 시나리오를 session.context에 저장 (S5에서 사용)
        if not hasattr(session, 'context') or session.context is None:
            session.context = {}
        session.context['s4_scenario'] = ai_response.text
        logger.info(f"📝 S4 시나리오 저장: {ai_response.text[:50]}...")
        
        # 액션 아이템 (감정 선택지)
        action_items = ActionItems(
            type="emotion_selection",
            options=[
                emotion_result.primary.value,
                *[e.value for e in emotion_result.secondary]
            ][:3],  # 최대 3개
            instruction=f"{session.child_name}아 그 친구는 어떤 기분이었을 것 같아?"
        )
        
        # stt_result 직렬화
        try:
            if hasattr(stt_result, 'model_dump'):
                stt_dict = stt_result.model_dump()
            elif hasattr(stt_result, 'dict'):
                stt_dict = stt_result.dict()
            else:
                stt_dict = {
                    "text": getattr(stt_result, 'text', ''),
                    "confidence": getattr(stt_result, 'confidence', 1.0),
                    "language": getattr(stt_result, 'language', 'ko')
                }
        except Exception as e:
            logger.error(f"❌ _execute_s4: stt_result 직렬화 실패: {e}")
            stt_dict = {
                "text": getattr(stt_result, 'text', ''),
                "confidence": getattr(stt_result, 'confidence', 1.0),
                "language": getattr(stt_result, 'language', 'ko')
            }
        
        return {
            "stt_result": stt_dict,
            "safety_check": SafetyCheckResult(is_safe=True, flagged_categories=[]).dict(),
            "emotion_detected": emotion_result.dict(),
            "ai_response": ai_response.dict(),
            "action_items": action_items.dict(),
            "llm_evaluation": llm_evaluation  # LLM 평가 결과 추가
        }
        
    ######################################## s5 ########################################
    def _execute_s5(
        self, request: DialogueTurnRequest, session: DialogueSession, child_text: str, stt_result: STTResult
    ) -> Dict:
        """S5: 원인 탐색"""
        logger.info("S5 실행: 경험 감정 이유 탐색")
        
        # stt_result 검증 및 로깅
        if stt_result is None:
            logger.error("❌ _execute_s5: stt_result가 None입니다!")
            raise ValueError("stt_result가 None입니다")
        
        logger.info(f"🔍 _execute_s5: 받은 stt_result.text='{stt_result.text}' (길이: {len(stt_result.text) if stt_result.text else 0})")
        logger.info(f"🔍 _execute_s5: 받은 child_text='{child_text}' (길이: {len(child_text) if child_text else 0})")
        
        # 1. 컨텍스트 (S4에서 파악한 감정)
        context = self.context_manager.build_context_for_prompt(
            session, Stage.S5_ASK_REASON_EMOTION_2
        )
        
        # S5 초기 진입 시 (retry_count == 0): 아이가 아직 답변 안 함 -> 바로 질문 생성
        if session.retry_count == 0:
            logger.info(f"🔍 S5 초기 진입 (retry_count=0) -> 감정 이유 질문 생성")
            ai_response = self._generate_s5_ask_reason_question(
                child_name=session.child_name,
                context=context
            )
            
            # stt_result 직렬화
            try:
                if hasattr(stt_result, 'model_dump'):
                    stt_dict = stt_result.model_dump()
                elif hasattr(stt_result, 'dict'):
                    stt_dict = stt_result.dict()
                else:
                    stt_dict = {
                        "text": getattr(stt_result, 'text', ''),
                        "confidence": getattr(stt_result, 'confidence', 1.0),
                        "language": getattr(stt_result, 'language', 'ko')
                    }
            except Exception as e:
                logger.error(f"❌ _execute_s5: stt_result 직렬화 실패: {e}")
                stt_dict = {
                    "text": getattr(stt_result, 'text', ''),
                    "confidence": getattr(stt_result, 'confidence', 1.0),
                    "language": getattr(stt_result, 'language', 'ko')
                }
            
            return {
                "stt_result": stt_dict,
                "safety_check": SafetyCheckResult(is_safe=True, flagged_categories=[]).dict(),
                "ai_response": ai_response.dict(),
                "action_items": ActionItems(
                    type="open_question",
                    instruction="왜 그런 감정을 느꼈을까?"
                ).dict()
            }
        
        # 2. LLM 기반 평가 (retry_count >= 1, 아이가 답변한 경우)
        logger.info(f"🔍 S5 LLM 평가 수행 (타인 감정 이유 추론 체크)")
        llm_evaluation = self._evaluate_child_answer_with_llm(
            stage=Stage.S5_ASK_REASON_EMOTION_2,
            child_answer=child_text,
            session=session,
            context=context
        )
        is_success = llm_evaluation.get("success", False)
        logger.info(f"🔍 S5 LLM 평가 결과: {is_success} - {llm_evaluation.get('reason', '')}")
        
        # Max retry 체크: retry_count >= 2이고 성공하지 못했을 때만 전환 메시지
        if session.retry_count >= 2 and not is_success:
            logger.info(f"🔄 S5 max retry 도달 (retry_count={session.retry_count}), 자연스럽게 S6로 전환")
            ai_response = self._generate_s5_max_retry_transition(
                child_name=session.child_name,
                context=context
            )
            
            # stt_result 직렬화
            try:
                if hasattr(stt_result, 'model_dump'):
                    stt_dict = stt_result.model_dump()
                elif hasattr(stt_result, 'dict'):
                    stt_dict = stt_result.dict()
                else:
                    stt_dict = {
                        "text": getattr(stt_result, 'text', ''),
                        "confidence": getattr(stt_result, 'confidence', 1.0),
                        "language": getattr(stt_result, 'language', 'ko')
                    }
            except Exception as e:
                logger.error(f"❌ _execute_s5: stt_result 직렬화 실패: {e}")
                stt_dict = {
                    "text": getattr(stt_result, 'text', ''),
                    "confidence": getattr(stt_result, 'confidence', 1.0),
                    "language": getattr(stt_result, 'language', 'ko')
                }
            
            return {
                "stt_result": stt_dict,
                "safety_check": SafetyCheckResult(is_safe=True, flagged_categories=[]).dict(),
                "ai_response": ai_response.dict(),
                "action_items": ActionItems(
                    type="open_question",
                    instruction="다음 단계로 넘어가기"
                ).dict()
            }
        
        # 성공한 경우 또는 retry 중: AI 응답 생성
        if is_success:
            # 성공: S6(액션카드)로 자연스럽게 전환하는 마무리 멘트
            ai_response = self._generate_empathic_response(
                child_name=session.child_name,
                child_text=child_text,
                emotion="",  # S5는 감정 분류 없음
                context=context,
                stage=Stage.S5_ASK_REASON_EMOTION_2
            )
        else:
            # 실패 시 retry: 재질문
            if session.retry_count == 1:
                ai_response = AISpeech(text=f"{session.child_name}아, 다시 한 번 생각해볼까? 그 친구는 왜 그런 기분이 들었을까?")
            elif session.retry_count == 2:
                # retry_2: 아이가 말한 경험 기반 이지선다 질문
                ai_response = self._generate_s5_rc2(
                    child_name=session.child_name,
                    context=context,
                    session=session
                )
            else:
                ai_response = self._generate_s5_ask_reason_question(
                    child_name=session.child_name,
                    context=context
                )
        
        # stt_result 직렬화
        try:
            if hasattr(stt_result, 'model_dump'):
                stt_dict = stt_result.model_dump()
            elif hasattr(stt_result, 'dict'):
                stt_dict = stt_result.dict()
            else:
                stt_dict = {
                    "text": getattr(stt_result, 'text', ''),
                    "confidence": getattr(stt_result, 'confidence', 1.0),
                    "language": getattr(stt_result, 'language', 'ko')
                }
        except Exception as e:
            logger.error(f"❌ _execute_s5: stt_result 직렬화 실패: {e}")
            stt_dict = {
                "text": getattr(stt_result, 'text', ''),
                "confidence": getattr(stt_result, 'confidence', 1.0),
                "language": getattr(stt_result, 'language', 'ko')
            }
        
        # 액션 아이템
        action_items = ActionItems(
            type="open_question",
            instruction="왜 그런 감정을 느꼈을까?"
        )
        
        result_dict = {
            "stt_result": stt_dict,
            "safety_check": SafetyCheckResult(is_safe=True, flagged_categories=[]).dict(),
            "ai_response": ai_response.dict(),
            "action_items": action_items.dict(),
            "llm_evaluation": llm_evaluation  # LLM 평가 결과 추가
        }
        
        # 반환 전 최종 확인
        result_stt = result_dict.get("stt_result", {})
        result_text = result_stt.get("text", "") if isinstance(result_stt, dict) else ""
        logger.info(f"🔍 _execute_s5: 반환할 result_dict['stt_result']['text']='{result_text}' (길이: {len(result_text)})")
        
        return result_dict
    
    ######################################## s6 ########################################
    def _execute_s6(
        self, request: DialogueTurnRequest, session: DialogueSession, child_text: str, stt_result: STTResult
    ) -> Dict:
        """S5: 마무리"""
        logger.info("S6 실행: 마무리")
        
        # 1. 컨텍스트
        context = self.context_manager.build_context_for_prompt(
            session, Stage.S6_ACTION_CARD
        )
        
        # 2. AI 응답 (마무리 인사)
        ai_response = AISpeech(
            text=f"{session.child_name}아, 오늘 정말 잘했어! 행동카드를 언제든 사용해봐!",
            tts_url=None,
            duration_ms=None
        )
        
        # 3. 액션 아이템 (종료)
        action_items = ActionItems(
            type="open_question",
            instruction="대화가 끝났어요!"
        )
        
        # stt_result 직렬화
        try:
            if hasattr(stt_result, 'model_dump'):
                stt_dict = stt_result.model_dump()
            elif hasattr(stt_result, 'dict'):
                stt_dict = stt_result.dict()
            else:
                stt_dict = {
                    "text": getattr(stt_result, 'text', ''),
                    "confidence": getattr(stt_result, 'confidence', 1.0),
                    "language": getattr(stt_result, 'language', 'ko')
                }
        except Exception as e:
            logger.error(f"❌ _execute_s5: stt_result 직렬화 실패: {e}")
            stt_dict = {
                "text": getattr(stt_result, 'text', ''),
                "confidence": getattr(stt_result, 'confidence', 1.0),
                "language": getattr(stt_result, 'language', 'ko')
            }
        
        return {
            "stt_result": stt_dict,
            "safety_check": SafetyCheckResult(is_safe=True, flagged_categories=[]).dict(),
            "ai_response": ai_response.dict(),
            "action_items": action_items.dict()
        }
    
    
    def _generate_empathic_response(
        self, child_name: str, child_text: str, emotion: str, context: Dict, stage: Stage
    ) -> AISpeech:
        """공감 응답 생성 (S1) - 공감 + 왜 그런 감정이 들었는지 질문"""
        story = context.get("story", {})
        character_name = story.get("character_name", "콩쥐")
        
        # 감정에 따른 공감 표현
        empathy_map = {
            "행복": "기쁘구나!",
            "기쁨": "좋았구나!",
            "슬픔": "슬펐구나.",
            "속상": "속상했구나.",
            "화남": "화났구나.",
            "무서움": "무서웠구나.",
            "놀라움": "놀랐구나!",
            "신기": "신기했구나!"
        }
        
        # 감정에 따른 과거형 표현
        emotion_verb_map = {
            "행복": "행복했을",
            "기쁨": "기뻤을",
            "슬픔": "슬펐을",
            "속상": "속상했을",
            "화남": "화났을",
            "무서움": "무서웠을",
            "놀라움": "놀랐을",
            "신기": "신기했을"
        }
        
        # empathy = empathy_map.get(emotion, "그랬구나.")
        # emotion_verb = emotion_verb_map.get(emotion, f"{emotion}을 느꼈을")
        
        # 공감 + 왜 그런 감정이 들었는지 질문
        response_text = f"그랬구나. 왜 그런 감정이 들었을 것 같아?"
        
        return AISpeech(text=response_text)
    
    ## _generate_ask_experience_question ##
    def _generate_ask_experience_question(
        self, child_name: str, context: Dict
    ) -> AISpeech:
        """원인 탐색 질문 생성 (S2) - 동화 캐릭터가 왜 그런 감정을 느꼈는지 묻기"""
        story = context.get("story", {})
        character_name = story.get("character_name", "콩쥐")
        prompt_type = story.get("s2_prompt_type", "default")
        
        # 사회인식 스킬의 경우: 감정 설명하기
        if prompt_type == "social_awareness":
            question = f"{character_name}가 왜 그렇게 느꼈다고 생각해? 그 이유를 한 번 말해볼까?"
        else:
            # 기본: 왜 그렇게 느꼈는지 물어보는 질문 (감정 단어 사용하지 않음)
            question = f"{character_name}가 왜 그렇게 느꼈을 것 같아?"
        
        return AISpeech(text=question)
    
    def _generate_s2_empathy_and_ask_experience(
        self, child_name: str, child_text: str, context: Dict
    ) -> AISpeech:
        """S2에서 제대로 된 답변을 받았을 때: 공감 + 비슷한 경험 질문"""
        story = context.get("story", {})
        character_name = story.get("character_name", "콩쥐")
        prompt_type = story.get("s2_prompt_type", "default")
        
        # 사회인식 스킬의 경우: 내 경험 말해보기
        if prompt_type == "social_awareness":
            response = f"너도 혹시 누가 힘들어서 울고 있거나 속상해하는 걸 본 적 있어? 있다면 나에게 말해줘."
        else:
            # 기본: 공감 + 비슷한 경험 질문 (감정 단어 반복하지 않음)
            response = f"그랬구나. {child_name}이도 그런 경험이 있어?"
        
        return AISpeech(text=response)
                
                
    def _generate_s5_ask_reason_question(
        self, child_name: str, context: Dict
    ) -> AISpeech:
        """S5 초기 질문 생성 - 실생활 상황에서 왜 그런 감정을 느꼈는지 묻기"""
        s4_scenario = context.get('s4_scenario', '그 상황')
        
        # S5는 감정의 이유를 묻는 단계
        question = f"그 친구가 왜 그런 기분이 들었을까? {child_name}이 생각에는 어떤 것 같아?"
        
        return AISpeech(text=question)
    
    ## _generate_ask_experience_retry_count_1 ##
    def _generate_s2_rc1(
        self, child_name: str, context: Dict
    ) -> AISpeech:
        """예시 상황 제시 (S2) - retry_1에서 간단한 재질문"""
        story = context.get("story", {})
        # character_name = story.get("character_name", "콩쥐")
        logger.info("_generate_ask_experience_retry_count_1")
        
        # 격려하는 톤으로 재질문
        question = f"{child_name}아, 천천히 생각해봐. 내가 왜 그렇게 느꼈을 것 같아?"
        
        return AISpeech(text=question)
    
    
    ## _generate_s2_retry_count_2 ##
    def _generate_s2_rc2(
        self, story_name: str, child_name: str, context: Dict
    ) -> AISpeech:
        """2지선다 질문 (retry_2) - 동화 캐릭터가 감정을 느낀 이유 2가지 제시"""
        story = context.get("story", {})
        character_name = story.get("character_name", "")
        story_intro = story.get("intro", "")
        story_scene = story.get("scene", "")
        
        prompt = ChatPromptTemplate.from_messages([
            ("system", f"""
            너는 6살~9살 아이와 대화하는 따뜻하고 친절한 동화 선생님이야.
            
            아이가 동화 속 '{character_name}'의 감정 이유를 잘 설명하지 못하고 있어.
            지금은 두 번째 재시도야. 아이가 쉽게 선택할 수 있도록 story_scene을 기반으로 개연성 있는 2가지 이유를 제시해줘야 해.

            동화 제목: {story_name}
            동화 인트로: {story_intro}
            동화 장면: {story_scene}
            
            중요:
            1. 아이를 부르면서 시작. 예시) "{child_name}아,"
            2. story_scene의 구체적인 상황을 반영해서 이유 2가지를 만들어야 해
            3. 두 이유는 모두 story_scene에서 실제로 일어난 일이거나 추론 가능한 일이어야 해
            4. 질문 한 문장만 출력
            5. 감정 단어를 직접 언급하지 마
            6. 6살~9살 아이가 이해할 수 있는 단어 사용
            7. 형식: "혹시 [이유1]해서 그랬을까? 아니면 [이유2]해서 그랬을까?"
            8. 너가 아는 {story_name} 줄거리를 참고해서 이유를 만들어도 좋아. 하지만 잔혹동화면 절대 사용하지 마

            좋은 예시 (콩쥐팥쥐):
            - story_scene: "물을 몇 시간째 붓고 있는데 아무리 물을 부어도 독에 물이 차지 않아. 곧 있으면 새엄마가 올텐데 어쩌지?"
            - 출력: "{child_name}아, 혹시 아무리 해도 물이 안 차서 그랬을까? 아니면 새엄마가 화낼까봐 무서워서 그랬을까?"
            
            나쁜 예시:
            - "혹시 힘들어서 그랬을까? 아니면 슬퍼서 그랬을까?" (story_scene과 무관하고 감정 언급)
            - "혹시 착해서 그랬을까? 아니면 나빠서 그랬을까?" (이유가 아닌 성격 묘사)
            """),
            ("user", f"story_scene을 자세히 읽고, '{character_name}'가 그렇게 느낀 구체적인 이유 2가지를 선택지로 제시하는 질문 한 문장만 출력해. 반드시 story_scene의 상황을 반영해야 해.")
            ])
            
        response = self.llm.invoke(prompt.format_messages())
        return AISpeech(text=response.content.strip())
    
    
    def _generate_s5_rc2(
        self, child_name: str, context: Dict, session: DialogueSession
    ) -> AISpeech:
        """S5 retry_2: 아이가 본 친구의 경험에 대해 감정 이유 2가지 선택지 제시"""
        story = context.get("story", {})
        
        # S3에서 아이가 말한 자신의 경험 가져오기
        s3_answer_content = session.context.get('s3_answer_content', '') if hasattr(session, 'context') and session.context else ''
        
        # S4에서 AI가 물어본 감정 질문 내용 또는 시나리오 가져오기
        s4_scenario = session.context.get('s4_scenario', '그 상황') if hasattr(session, 'context') and session.context else '그 상황'
        
        logger.info(f"🔍 S5 retry_2: s3_answer_content='{s3_answer_content[:50] if s3_answer_content else '없음'}...'")
        logger.info(f"🔍 S5 retry_2: s4_scenario='{s4_scenario[:50]}...'")
        
        # 아이가 S3에서 자신의 경험을 말했으면 그것을 사용
        if s3_answer_content:
            prompt = ChatPromptTemplate.from_messages([
                ("system", f"""
                너는 6살~9살 아이와 대화하는 따뜻하고 친절한 동화 선생님이야.
                
                아이가 자신이 본 친구의 경험에 대해 이야기했어:
                "{s3_answer_content}"
                
                그리고 S4에서 그 친구의 감정에 대해 물어봤어:
                "{s4_scenario}"
                
                지금 아이가 그 친구의 감정 이유를 잘 설명하지 못하고 있어.
                두 번째 재시도야. 아이가 말한 경험 속 친구가 그런 감정을 느낀 이유 2가지를 제시해줘.
                
                중요:
                1. "{child_name}아," 로 시작
                2. 아이가 말한 상황을 참고해서 구체적인 이유 2가지 제시
                3. 질문 한 문장만 출력
                4. 6살~9살 아이가 이해할 수 있는 단어 사용
                5. 형식: "혹시 [이유1]해서 그랬을까? 아니면 [이유2]해서 그랬을까?"
                
                예시: 
                - 아이가 "친구가 혼자 있었어"라고 했다면 → "{child_name}아, 혹시 친구들이 같이 안 놀아줘서 그랬을까? 아니면 하고 싶은 게 없어서 그랬을까?"
                - 아이가 "친구가 울었어"라고 했다면 → "{child_name}아, 혹시 누가 놀렸어서 그랬을까? 아니면 무언가를 잃어버려서 그랬을까?"
                """),
                ("user", "아이가 말한 경험 속 친구가 그런 감정을 느낀 이유 2가지를 선택지로 제시하는 질문 한 문장만 출력해.")
            ])
        else:
            # 아이가 경험을 말하지 않았거나, AI가 제시한 시나리오인 경우
            prompt = ChatPromptTemplate.from_messages([
                ("system", f"""
                너는 6살~9살 아이와 대화하는 따뜻하고 친절한 동화 선생님이야.
                
                아이가 실생활 상황에서 다른 사람의 감정 이유를 잘 설명하지 못하고 있어.
                지금은 두 번째 재시도야.
                
                상황: {s4_scenario}
                
                중요:
                1. "{child_name}아," 로 시작
                2. 질문 한 문장만 출력
                3. 격려하는 톤 사용
                4. 아이가 이해하기 쉬운 단어 사용
                5. 형식: "혹시 [이유1]해서 그랬을까? 아니면 [이유2]해서 그랬을까?"
                
                예시: "{child_name}아, 혹시 친구들이 자기를 안 끼워줘서 그랬을까? 아니면 게임을 하고 싶은데 못해서 그랬을까?"
                """),
                ("user", "실생활 상황에서 타인이 그런 감정을 느낀 이유 2가지를 선택지로 제시하는 질문 한 문장만 출력해.")
            ])
        
        response = self.llm.invoke(prompt.format_messages())
        return AISpeech(text=response.content.strip())
    

        
    
    
    def _generate_ask_similar_experience(
        self, child_name: str, context: Dict
    ) -> AISpeech:
        """비슷한 경험이 있는지 묻기 (S3 초기 질문)"""
        # 기본: 비슷한 경험 질문 (감정 단어 반복하지 않음)
        question = f"{child_name}이도 그런 경험이 있어?"
        return AISpeech(text=question)
    
    def _generate_social_awareness_scenario_1(
        self, child_name: str, context: Dict
    ) -> AISpeech:
        """사회인식: '없다'고 또 답했을 때 두 번째 일상 시나리오"""
        scenario = """그럼 다른 상황을 말해줄게.

        쉬는 시간, 보드게임은 딱 4명만 할 수 있는데
        한 친구가 옆에서 조용히 서서 구경만 하고 있어.
        그 친구는 어떤 마음이었을까?"""
        return AISpeech(text=scenario)
    
    def _generate_social_awareness_scenario_2(
        self, child_name: str, context: Dict
    ) -> AISpeech:
        """사회인식: '없다'고 답했을 때 첫 번째 일상 시나리오"""
        scenario = """그럼 내가 하나 알려줄게.

        급식 줄에 친구들이 서 있는데 앞에서 서로 밀었다고 싸우고 있어.
        '왜 밀어!' 하고 화내는 친구는 어떤 마음이었을까?"""
        return AISpeech(text=scenario)
    
    def _generate_social_awareness_situation_summary(
        self, child_name: str, child_text: str, context: Dict
    ) -> AISpeech:
        """사회인식: '있다'고 답했을 때 아동 상황 정리"""
        # 아동이 말한 내용을 그대로 활용
        response = f"""그때 그 친구는 왜 그런 마음이었을거라고 생각해?"""
        return AISpeech(text=response)
    
    def _generate_s3_rc2(
        self, child_name: str, context: Dict
    ) -> AISpeech:
        """2지선다 질문 (S3 retry_2) - 비슷한 경험 2가지 예시 제시 또는 두 번째 시나리오"""
        story = context.get("story", {})
        character_name = story.get("character_name", "콩쥐")
        story_intro = story.get("intro", "")
        story_scene = story.get("scene", "")
        prompt_type = story.get("s3_prompt_type", "default")
        
        # 사회인식 스킬: 두 번째 일상 시나리오 제공
        if prompt_type == "social_awareness":
            question = """그럼 다른 상황을 말해줄게.

            쉬는 시간, 보드게임은 딱 4명만 할 수 있는데
            한 친구가 옆에서 조용히 서서 구경만 하고 있어.
            그 친구는 어떤 마음이었을까?"""
            return AISpeech(text=question)
        
        # 기본: 2가지 경험 예시 질문
        prompt = ChatPromptTemplate.from_messages([
            ("system", f"""
            아이에게 비슷한 경험이 있는지 2가지 구체적인 예시를 들어 질문해야 해.
            
            동화 인트로: {story_intro}
            동화 장면: {story_scene}

            중요: 
            1. 질문 한 문장만 출력해. 다른 말은 하지 마.
            2. 아이가 겪을 법한 일상적인 경험 2가지를 예시로 제시
            3. 감정 단어를 반복하지 마
            4. 6살~9살 사이의 아이에 맞는 단어 사용
            
            형식: "혹시 {child_name}이도 [경험1] 했던 적이 있어? 아니면 [경험2] 했어?"
            
            예시: "혹시 {child_name}이도 친구한테 섭섭했던 적이 있어? 아니면 가족한테 속상했던 적이 있어?"
            """),
            ("user", f"{child_name}이에게 비슷한 경험 2가지를 예시로 제시하는 질문 한 문장만 출력해. 감정 단어를 반복하지 마.")
        ])
        
        response = self.llm.invoke(prompt.format_messages())
        return AISpeech(text=response.content.strip())
    
    def _generate_s5_empathy_and_ask_experience(
        self, child_name: str, child_text: str, context: Dict
    ) -> AISpeech:
        """S5에서 제대로 된 답변을 받았을 때: 공감 + 비슷한 경험 질문"""
        story = context.get("story", {})
        character_name = story.get("character_name", "콩쥐")
        prompt_type = story.get("s5_prompt_type", "default")
        
        # 사회인식 스킬의 경우: 내 경험 말해보기
        if prompt_type == "social_awareness":
            response = f"그렇지!"
        else:
            # 기본: 공감 + 비슷한 경험 질문 (감정 단어 반복하지 않음)
            response = f"그랬구나. {child_name}이 오늘 정말 잘했어! 행동카드를 줄게"
        
        return AISpeech(text=response)
                
                
    def _generate_strategy_suggestion(
        self, child_name: str, strategies: List[str], context: Dict
    ) -> AISpeech:
        """전략 제안 생성 (S3) - 기본 시나리오용"""
        story = context.get("story", {})
        character_name = story.get("character_name", "콩쥐")
        
        # 기본: 전략 제안
        strategies_text = ", ".join(strategies)
        
        prompt = ChatPromptTemplate.from_messages([
            ("system", f"""
            너는 '{character_name}'이야.
            아이에게 행동 전략을 제안하고 선택하도록 유도해야 해.

            규칙:
            1. "그럴 때는 이런 방법들을 해볼 수 있어" 형태로 제안
            2. 두 문장 이내
            3. 격려하는 톤
            4. 6살~9살 사이의 아이에 맞는 단어 사용
            """),
            
            ("user", f"""
                {child_name}이에게 이 방법들을 제안해줘:
                {strategies_text}

            어떤 걸 해볼지 선택하게 해줘.
            """)
        ])
        
        response = self.llm.invoke(prompt.format_messages())
        return AISpeech(text=response.content.strip())
    
    ##################################### Legacy Functions #####################################
    
    def _generate_lesson_connection(
        self, child_name: str, lesson: str, context: Dict
    ) -> AISpeech:
        """교훈 연결 생성 (S4) - 더 이상 사용하지 않음 (legacy)"""
        story = context.get("story", {})
        character_name = story.get("character_name", "콩쥐")
        
        prompt = ChatPromptTemplate.from_messages([
            ("system", f"""
            너는 '{character_name}'이야.
            아이에게 오늘 배운 교훈을 명시적으로 전달해야 해.

            규칙:
            1. "오늘 우리가 배운 건..." 형태로 시작
            2. 교훈을 한 문장으로 명확히
            3. 격려하며 마무리
            """),
            ("user", f"""
            {child_name}이에게 이 교훈을 전달해줘:
            "{lesson}"
            """)
        ])
        
        response = self.llm.invoke(prompt.format_messages())
        return AISpeech(text=response.content.strip())
    
    def _generate_lesson_and_action_card(
        self, child_name: str, lesson: str, action_card, context: Dict
    ) -> AISpeech:
        """교훈 연결 + 행동카드 제시 (S4)"""
        story = context.get("story", {})
        character_name = story.get("character_name", "콩쥐")
        
        # 행동카드 정보 추출 (Pydantic 모델이므로 속성 직접 접근)
        card_title = getattr(action_card, "title", "행동카드")
        card_strategy = getattr(action_card, "strategy", "")
        
        prompt = ChatPromptTemplate.from_messages([
            ("system", f"""
            너는 '{character_name}'이야.
            아이에게 오늘 배운 교훈을 전달하고, 그 교훈을 실천할 수 있는 행동카드를 만들어줬다고 알려줘야 해.

            중요:
            - 교훈: "{lesson}"
            - 행동카드 제목: "{card_title}"
            - 이 둘은 서로 연관되어 있어야 해. 교훈이 "왜"를 말한다면, 행동카드는 "어떻게"를 보여줘.
            
            규칙:
            1. 교훈을 먼저 간단히 말해 (한 문장)
            2. "그래서" 또는 "그럴 때"로 연결하며 행동카드 소개
            3. 행동카드 제목을 명확히 언급
            4. 격려하며 마무리
            5. 세 문장 이내로 간결하게
            
            좋은 예시:
            - 교훈: "감정을 표현하는 것이 중요해" → 행동카드: "지금 감정 말로 표현하기"
              → "오늘 우리는 감정을 표현하는 방법을 배웠어. 그래서 '{card_title}' 행동카드를 만들었어! 힘들 때마다 이 카드로 네 감정을 말해봐."
            
            나쁜 예시:
            - "배운 것을 기억하는 게 중요해" → 행동카드: "지금 감정 말로 표현하기"
              (교훈과 행동카드가 연결되지 않음)
            """),
            ("user", f"""
            {child_name}이에게 교훈과 행동카드를 연결해서 전달해줘.
            
            교훈: "{lesson}"
            행동카드: "{card_title}"
            
            """)
        ])
        
        response = self.llm.invoke(prompt.format_messages())
        return AISpeech(text=response.content.strip())
    
    def _summarize_conversation(self, session: DialogueSession) -> str:
        """대화 요약"""
        moments = session.key_moments
        if not moments:
            return "대화 없음"
        
        summary_parts = []
        for moment in moments:
            summary_parts.append(f"{moment['stage']}: {moment['content']}")
        
        return " | ".join(summary_parts) 
    
    def _handle_safety_violation(
        self, safety_result: SafetyCheckResult, session: DialogueSession, stage: Stage, stt_result: STTResult
    ) -> Dict:
        """
        안전 필터 감지 시 교육적 대응
        - 에러를 발생시키지 않고 AI가 적절히 대응
        - 아동의 감정을 이해하면서도 올바른 방향으로 유도
        """
        # 컨텍스트 구성
        context = self.context_manager.build_context_for_prompt(session, stage)
        story_name = context.get("story", {}).get("character_name", "친구")
        child_name = session.child_name
        
        # 카테고리별 교육적 응답 생성
        category_prompts = {
            "self_harm": f"{child_name}아, 많이 힘들구나. 그런 생각이 들 때는 어른에게 꼭 말해야 해. 지금은 나랑 이야기하면서 마음을 풀어보자. 어떤 일이 있었는지 천천히 말해줄래?",
            "violence": f"{child_name}아, 화가 많이 났구나. 하지만 그런 표현보다는 '화가 났어', '속상했어'라고 말하면 더 좋을 것 같아. 무슨 일이 있었는지 다시 말해줄래?",
            "hate": f"{child_name}아, 속상한 마음은 이해해. 하지만 친구나 다른 사람을 미워하는 말은 사용하지 않는 게 좋아. 대신 어떤 점이 속상했는지 말해볼까?",
            "harassment": f"{child_name}아, 누군가를 괴롭히는 말은 듣는 사람도 말하는 사람도 마음이 아파. 다른 방식으로 이야기해볼 수 있을까?",
            "sexual": f"{child_name}아, 그 이야기는 조금 어려운 주제야. 우리는 {story_name}의 이야기로 돌아가자. 어떤 기분이 들었는지 말해줄래?"
        }
        
        # 첫 번째 flagged category에 대한 응답 선택
        ai_text = safety_result.message  # 기본 메시지
        if safety_result.flagged_categories:
            first_category = safety_result.flagged_categories[0]
            # 정확한 카테고리 매칭 또는 포함 검사
            for key, prompt in category_prompts.items():
                if key in first_category:
                    ai_text = prompt
                    break
        
        logger.info(f"안전 필터 교육적 응답: {ai_text[:50]}...")
        
        # stt_result 직렬화 (빈 텍스트가 아닌 원본 텍스트 유지)
        try:
            if hasattr(stt_result, 'model_dump'):
                stt_dict = stt_result.model_dump()
            elif hasattr(stt_result, 'dict'):
                stt_dict = stt_result.dict()
            else:
                stt_dict = {
                    "text": getattr(stt_result, 'text', ''),
                    "confidence": getattr(stt_result, 'confidence', 1.0),
                    "language": getattr(stt_result, 'language', 'ko')
                }
        except Exception as e:
            logger.error(f"❌ _handle_safety_violation: stt_result 직렬화 실패: {e}")
            stt_dict = {"text": getattr(stt_result, 'text', '')}
            
        return {
            "stt_result": stt_dict,
            "safety_check": safety_result.dict(),
            "ai_response": {"text": ai_text, "tts_url": None, "duration_ms": None},
            "action_items": ActionItems(
                type="open_question",
                instruction="다시 이야기해보자"
            ).dict()
        }
    
    def evaluate_turn_success(
        self, stage: Stage, result: Dict, child_text: str
    ) -> Dict:
        """
        턴 성공 여부 평가 (LLM 보조)
        
        Args:
            stage: 현재 Stage
            result: 턴 결과
            child_text: 아동 발화
        
        Returns:
            평가 결과 {"success": bool, "reason": str}
        """
        # 규칙 기반 + LLM 보조
        # 일단 규칙 기반만 (Orchestrator에서 처리)
        return {"success": True, "reason": "Orchestrator에서 판단"}
    
    def generate_fallback_response(
        self,
        session: DialogueSession,
        stage: Stage,
        next_retry_count: int
    ) -> AISpeech:
        """
        Stage 전환 실패 시 fallback 응답 생성
        
        Args:
            session: 현재 세션
            stage: 현재 Stage
            next_retry_count: 다음 턴의 retry_count (증가된 값)
        
        Returns:
            AISpeech: fallback 응답
        """
        logger.info(f"🔄 Fallback 응답 생성: Stage={stage.value}, next_retry_count={next_retry_count}")
        
        context = self.context_manager.build_context_for_prompt(session, stage)
        story = context.get("story", {})
        character_name = story.get("character_name", "콩쥐")
        
        if stage == Stage.S1_EMOTION_LABELING:
            if next_retry_count == 1:
                # retry_1: 개방형 질문 재시도
                logger.info("🔄 S1 retry_1: 개방형 질문 재시도")
                return AISpeech(text=f"{session.child_name}아, 괜찮아. 천천히 생각해봐. 어떤 기분이 들 것 같아?")
            elif next_retry_count == 2:
                # retry_2: 감정 선택지 3개 제시
                logger.info("🔄 S1 retry_2: 감정 선택지 제시")
                return AISpeech(text=f"{session.child_name}아, 내가 기뻤을 것 같아? 아니면 내가 화났을 것 같아?")
            # else:
            #     logger.info("🔄 S1 retry_3: 다음 단계로 건너뛰기")
            #     return AISpeech(text=f"{session.child_name}아 괜찮아! 감정을 말로 표현하는게 어려울 수 있어. 그럼 우리 다른 이야기를 해볼까?")

        elif stage == Stage.S2_ASK_REASON_EMOTION_1:
            if next_retry_count == 1:
                # retry_1: 간단한 재질문
                logger.info("🔄 S2 retry_1: 간단한 재질문")
                return self._generate_s2_rc1(session.child_name, context)
            elif next_retry_count == 2:
                # retry_2: 2지선다 질문 (캐릭터가 감정을 느낀 이유 2가지)
                logger.info("🔄 S2 retry_2: 2지선다 질문")
                return self._generate_s2_rc2(session.story_name, session.child_name, context)
            else:
                logger.info("🔄 S2 retry_3: 다음 단계로 건너뛰기")
                return AISpeech(text=f"그렇구나, {session.child_name}아. 이유를 대답하는 게 쉽지 않지? 좀 더 쉽게 대답할 수 있게 내가 도와줄게! 너는 혹시 누가 힘들어서 울고 있거나 속상해하는 걸 본 적 있어?")
        
        elif stage == Stage.S3_ASK_EXPERIENCE:
            if next_retry_count == 1:
                # retry_1: 간단한 재질문
                logger.info("🔄 S3 retry_1: 간단한 재질문")
                return AISpeech(text=f"{session.child_name}아, 괜찮아. 내가 힘들어하고 슬퍼했잖아, 그런 것처럼 다른 사람이 속상해하는 걸 본 적이 있었을까?")
            elif next_retry_count == 2:
                # retry_2: 2지선다 질문
                logger.info("🔄 S3 retry_2: 2지선다 질문")
                return AISpeech(text=f"{session.child_name}아, 혹시 너 친구가 우는 걸 본 적이 있었을까?")
                # return self._generate_s3_rc2(session.child_name, context)
            else:
                # retry_3: 예시 시나리오 제공
                logger.info("🔄 S3 retry_3: 예시 시나리오 제공하면서 다음 단계로 건너뛰기")
                return self._generate_social_awareness_scenario_1(session.child_name, context)
            
        elif stage == Stage.S4_REAL_WORLD_EMOTION:
            # SEL_CHARACTERS에서 동화별 action_card strategies 가져오기
            story_context = self.context_manager.get_story_context(session.story_name)
            
            if next_retry_count == 1:
                # retry_1: 전략 3개 재진술
                logger.info("🔄 S4 retry_1: 상황 재설명 및 감정 질문")
                return AISpeech(text=f"{session.child_name}아, 좀 더 쉽게 말해줄게. 그 아이 표정을 봤을 때 어떤 기분이었을 것 같았어?")
            elif next_retry_count == 2:
                # retry_2: 감정 선택지 제시 (2지선다)
                logger.info("🔄 S4 retry_2: 감정 선택지 제시")
                return AISpeech(text=f"{session.child_name}아, 그 친구는 화났을까, 아니면 슬펐을까?")
            else:
                # retry_3 이상: 정답 감정 알려주고 이유 묻기
                logger.info("🔄 S4 retry_3: 정답 감정 알려주고 이유 묻기")
                s4_emotion_ans = story.get("s4_emotion_ans_1", "슬픔")
                return AISpeech(text=f"괜찮아, {session.child_name}아! 그 친구는 {s4_emotion_ans}을 느꼈을 거야. 왜 {s4_emotion_ans}을 느꼈을 것 같아?")
        
        # S5 Fallback (S2와 유사)
        elif stage == Stage.S5_ASK_REASON_EMOTION_2:
            story = context.get("story", {})
            
            if next_retry_count == 1:
                # retry_1: 간단한 재질문
                logger.info("🔄 S5 retry_1: 간단한 재질문")
                return AISpeech(text=f"{session.child_name}아, 괜찮아. 그 친구가 왜 그런 표정을 지었을 것 같아?")
            elif next_retry_count == 2:
                # retry_2: 2지선다 질문 (프롬프팅)
                logger.info("🔄 S5 retry_2: 2지선다 질문 (프롬프팅)")
                return self._generate_s5_rc2(session.child_name, context, session)
            else:
                # retry_3: 자연스럽게 행동카드로 전환
                logger.info("🔄 S5 retry_3: 행동카드로 전환")
                return AISpeech(text=f"{session.child_name}아, 조금 어려웠지? 괜찮아! 그럼 이제 내가 {session.child_name}이에게 특별한 행동카드를 줄게. 이 카드를 보면서 연습해보자!")
            
        # 기본 응답
        return AISpeech(text=f"{session.child_name}아, 난 너의 친구야. 편하게 이야기해줘.")

##################################### Max Retry Transitions #####################################

    def generate_max_retry_transition_response(
            self, 
            child_name: str, 
            prev_stage: Stage, 
            next_stage: Stage
        ) -> AISpeech:
            """
            Max Retry 도달로 인한 강제 전환 시, 아이를 위로하고 다음 단계로 자연스럽게 잇는 멘트 생성
            """
            logger.info(f"🌉 강제 전환 브릿지 멘트 생성: {prev_stage.value} -> {next_stage.value}")

            # S1(감정 라벨링) -> S2(원인 묻기) 전환 시
            if prev_stage == Stage.S1_EMOTION_LABELING:
                text = (
                    f"{child_name}아, 괜찮아! 감정을 말로 표현하는 게 조금 어려울 수 있어. " # 위로 (S1 마무리)
                    "그럼 우리 다른 이야기를 해볼까? " # 연결
                    "혹시 콩쥐가 왜 그런 행동을 했을지 생각해본 적 있어?" # S2 진입
                )
                return AISpeech(text=text)

            # S2 -> S3 전환 시
            elif prev_stage == Stage.S2_ASK_REASON_EMOTION_1:
                text = (
                    f"그렇구나, {child_name}아. 왜 그랬을지 생각하는 게 쉽지 않지? 괜찮아! "
                    "그럼 혹시 너도 비슷한 일을 겪은 적이 있는지 이야기해볼까?"
                )
                return AISpeech(text=text)
            
            # # S3 -> S4 전환 시
            # elif prev_stage == Stage.S3_ASK_EXPERIENCE:
            #     return self._generate_social_awareness_scenario_1()
            #     # return AISpeech(text=text)
                
            # 기본 멘트
            return AISpeech(text=f"{child_name}아, 우리 다음 이야기로 넘어가보자!")
    
    def _generate_s1_max_retry_transition(
        self, child_name: str, context: Dict
    ) -> AISpeech:
        """S1에서 max retry 도달: 정답 감정을 알려주고 원인을 묻기"""
        story = context.get("story", {})
        character_name = story.get("character_name", "콩쥐")
        emotion_ans = story.get("emotion_ans", "슬픔")
        
        response = f"{child_name}아, 괜찮아! {character_name}는 {emotion_ans}을 느꼈을 거야. 왜 {emotion_ans}을 느꼈을 것 같아?"
        return AISpeech(text=response)
    
    def _generate_s2_max_retry_transition(
        self, child_name: str, context: Dict
    ) -> AISpeech:
        """S2에서 max retry 도달: 자연스럽게 S3(경험 묻기)로 전환"""
        response = f"그렇구나, {child_name}아. 이유를 대답하는 게 쉽지 않지? 좀 더 쉽게 대답할 수 있게 내가 도와줄게! 너는 혹시 누가 힘들어서 울고 있거나 속상해하는 걸 본 적 있어?"
        return AISpeech(text=response)
    
    def _generate_s3_max_retry_transition(
        self, child_name: str, context: Dict
    ) -> AISpeech:
        """S3에서 max retry 도달: scenario_1 제시하며 S4로 전환"""
        return self._generate_social_awareness_scenario_1(child_name, context)

    def _generate_s4_max_retry_transition(
        self, child_name: str, context: Dict
    ) -> AISpeech:
        """S4에서 max retry 도달: 정답 감정 알려주고 이유 묻기"""
        story = context.get("story", {})
        s4_emotion_ans = story.get("s4_emotion_ans_1", "슬픔")
        
        response = f"괜찮아, {child_name}아! 그 친구는 {s4_emotion_ans}을 느꼈을 거야. 왜 {s4_emotion_ans}을 느꼈을 것 같아?"
        return AISpeech(text=response)
    
    def _generate_s5_max_retry_transition(
        self, child_name: str, context: Dict
    ) -> AISpeech:
        """S5에서 max retry 도달: 자연스럽게 행동카드(S6)로 전환"""
        response = f"{child_name}아, 조금 어려웠지? 괜찮아! 그럼 이제 내가 {child_name}이에게 특별한 행동카드를 줄게. 이 카드를 보면서 연습해보자!"
        return AISpeech(text=response)
    
    # def _generate_s2_max_retry_transition(
    #     self, child_name: str, context: Dict
    # ) -> AISpeech:
    #     """S2에서 max retry 도달: 원인 탐색이 어려울 때 자연스럽게 다음 단계로"""
    #     story = context.get("story", {})
    #     character_name = story.get("character_name", "콩쥐")
        
    #     response = f"그렇구나, {child_name}아. 왜 그랬을지 생각하는 게 쉽지 않지? 너의 경험을 삼아 이야기하면 쉬워질거야!"
    #     return AISpeech(text=response)
    
    # def _generate_s3_max_retry_transition(
    #     self, child_name: str, context: Dict
    # ) -> AISpeech:
    #     """S3에서 max retry 도달: 대안 제시가 어려울 때 자연스럽게 다음 단계로"""
    #     response = f"{child_name}아, 충분히 생각해봤어! 이제 우리가 오늘 배운 것을 정리해볼까?"
    #     return AISpeech(text=response)
    
    # def _generate_s4_max_retry_transition(
    #     self, child_name: str, context: Dict
    # ) -> AISpeech:
    #     """S4에서 max retry 도달: 교훈 연결이 어려울 때 자연스럽게 다음 단계로"""
    #     response = f"괜찮아, {child_name}아! 오늘 우리가 이야기 나눈 것만으로도 충분해. 이제 마지막으로 행동카드를 만들어볼까?"
    #     return AISpeech(text=response)
    
    # # [추가됨] S5 Max Retry Transition
    # def _generate_s5_max_retry_transition(
    #     self, child_name: str, context: Dict
    # ) -> AISpeech:
    #     """S5에서 max retry 도달: S6(행동카드)로 전환"""
    #     response = f"{child_name}아, 충분히 잘 이야기해줬어! 이제 마지막으로 멋진 행동카드를 만들어볼까?"
    #     return AISpeech(text=response)