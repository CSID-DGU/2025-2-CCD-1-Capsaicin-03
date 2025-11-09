"""
L2 Agent: LLM 기반 Tool 실행 및 평가
- Tool 실행 (Orchestrator가 지정한 Tool)
- 결과 평가
- 대화 생성
- Fallback 전략 실행
"""
from typing import Dict, List, Optional
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
import logging
import os

from app.models.schemas import (
    Stage, DialogueTurnRequest, DialogueSession,
    STTResult, SafetyCheckResult, EmotionResult, AISpeech, ActionItems
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
            model="gpt-4o-mini",
            temperature=0.7,
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
            logger.warning(f"안전 필터 위반: {safety_result.flagged_categories}")
            return self._handle_safety_violation(safety_result)
        
        # 2. Stage별 Tool 실행 및 대화 생성
        if stage == Stage.S1_EMOTION_LABELING:
            return self._execute_s1(request, session, child_text, stt_result)
        
        elif stage == Stage.S2_ASK_EXPERIENCE:
            return self._execute_s2(request, session, child_text, stt_result)
        
        elif stage == Stage.S3_ACTION_SUGGESTION:
            return self._execute_s3(request, session, child_text, stt_result)
        
        elif stage == Stage.S4_LESSON_CONNECTION:
            return self._execute_s4(request, session, child_text, stt_result)
        
        elif stage == Stage.S5_ACTION_CARD:
            return self._execute_s5(request, session, child_text, stt_result)
        
        else:
            logger.error(f"알 수 없는 Stage: {stage}")
            return {"error": "Unknown stage"}
    
    # S1
    def _execute_s1(
        self, request: DialogueTurnRequest, session: DialogueSession, child_text: str, stt_result: STTResult
    ) -> Dict:
        """S1: 감정 라벨링"""
        logger.info("S1 실행: 감정 라벨링")
        
        # 1. 감정 분류
        emotion_result = self.emotion_classifier.classify(child_text)
        
        # 2. 컨텍스트 구성
        context = self.context_manager.build_context_for_prompt(
            request.story_name, session, Stage.S1_EMOTION_LABELING
        )
        
        # 3. AI 응답 생성
        ai_response = self._generate_empathic_response(
            child_name=request.child_name,
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
            instruction=f"{request.child_name}이는 어떤 기분이 들었을 것 같아?"
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
            "action_items": action_items.dict()
        }

    ##################################### S2 #####################################
    def _execute_s2(
        self, request: DialogueTurnRequest, session: DialogueSession, child_text: str, stt_result: STTResult
    ) -> Dict:
        """S2: 원인 탐색"""
        logger.info("S2 실행: 경험 탐색")
        
        # stt_result 검증 및 로깅
        if stt_result is None:
            logger.error("❌ _execute_s2: stt_result가 None입니다!")
            raise ValueError("stt_result가 None입니다")
        
        logger.info(f"🔍 _execute_s2: 받은 stt_result.text='{stt_result.text}' (길이: {len(stt_result.text) if stt_result.text else 0})")
        logger.info(f"🔍 _execute_s2: 받은 child_text='{child_text}' (길이: {len(child_text) if child_text else 0})")
        
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
        
        # 1. 컨텍스트 (S1에서 파악한 감정)
        context = self.context_manager.build_context_for_prompt(
            request.story_name, session, Stage.S2_ASK_EXPERIENCE
        )
        
        # identified_emotion = context.get("identified_emotion", "감정")
        
        # 2. AI 응답 생성 (원인 탐색 질문)
        ai_response = self._generate_ask_experience_question(
            child_name=request.child_name,
            # emotion=identified_emotion,
            context=context
        )
        
        # 3. 액션 아이템 (개방형 질문)
        action_items = ActionItems(
            type="open_question",
            instruction="비슷한 경험이 있어?"
        )
        
        result_dict = {
            "stt_result": stt_dict,
            "safety_check": SafetyCheckResult(is_safe=True, flagged_categories=[]).dict(),
            "ai_response": ai_response.dict(),
            "action_items": action_items.dict()
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
        """S3: 대안 제시"""
        logger.info("S3 실행: 대안 제시")
        
        # stt_result 검증 및 로깅
        if stt_result is None:
            logger.error("❌ _execute_s3: stt_result가 None입니다!")
            raise ValueError("stt_result가 None입니다")
        
        logger.info(f"🔍 _execute_s3: 받은 stt_result.text='{stt_result.text}' (길이: {len(stt_result.text) if stt_result.text else 0})")
        logger.info(f"🔍 _execute_s3: 받은 child_text='{child_text}' (길이: {len(child_text) if child_text else 0})")
        
        # 1. 컨텍스트 (S2에서 파악한 상황)
        context = self.context_manager.build_context_for_prompt(
            request.story_name, session, Stage.S3_ACTION_SUGGESTION
        )
        
        emotion = session.emotion_history[-1].value if session.emotion_history else "감정"
        situation = context.get("situation", child_text)
        
        logger.info(f"🔍 _execute_s3: emotion={emotion}, situation={situation}")
        
        # 2. 행동 전략 초안 생성
        strategies = self.action_card_generator.generate_draft(
            emotion=emotion,
            situation=situation,
            child_name=request.child_name
        )
        
        logger.info(f"🔍 _execute_s3: 생성된 전략들={strategies}")
        
        # 3. AI 응답 생성 (전략 제안)
        ai_response = self._generate_strategy_suggestion(
            child_name=request.child_name,
            strategies=strategies,
            context=context
        )
        
        # 4. 액션 아이템 (선택지 제공)
        action_items = ActionItems(
            type="emotion_selection",  # 전략 선택
            options=strategies,
            instruction="어떤 방법을 해볼까?"
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
            "strategies": strategies  # 전략 목록 포함 (orchestrator에서 사용)
        }
        
        # 반환 전 최종 확인
        result_stt = result_dict.get("stt_result", {})
        result_text = result_stt.get("text", "") if isinstance(result_stt, dict) else ""
        result_strategies = result_dict.get("strategies", [])
        logger.info(f"🔍 _execute_s3: 반환할 result_dict['stt_result']['text']='{result_text}' (길이: {len(result_text)})")
        logger.info(f"🔍 _execute_s3: 반환할 result_dict['strategies']={result_strategies}")
        
        return result_dict
    
    def _execute_s4(
        self, request: DialogueTurnRequest, session: DialogueSession, child_text: str, stt_result: STTResult
    ) -> Dict:
        """S4: 교훈 연결"""
        logger.info("S4 실행: 교훈 연결")
        
        # 1. 컨텍스트 (동화 교훈)
        context = self.context_manager.build_context_for_prompt(
            request.story_name, session, Stage.S4_LESSON_CONNECTION
        )
        
        lesson = context.get("lesson", "배운 것을 기억하자")
        
        # 2. AI 응답 생성 (교훈 명시)
        ai_response = self._generate_lesson_connection(
            child_name=request.child_name,
            lesson=lesson,
            context=context
        )
        
        # 3. 액션 아이템 (확인)
        action_items = ActionItems(
            type="yes_no",
            options=["네", "알겠어요"],
            instruction="알겠지?"
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
            "action_items": action_items.dict()
        }
    
    def _execute_s5(
        self, request: DialogueTurnRequest, session: DialogueSession, child_text: str, stt_result: STTResult
    ) -> Dict:
        """S5: 행동카드 생성"""
        logger.info("S5 실행: 행동카드 생성")
        
        # 1. 전체 대화 요약
        context = self.context_manager.build_context_for_prompt(
            request.story_name, session, Stage.S5_ACTION_CARD
        )
        
        conversation_summary = self._summarize_conversation(session)
        
        emotion = session.emotion_history[-1].value if session.emotion_history else "감정"
        situation = ""
        selected_strategy = ""
        
        # S2, S3에서 정보 추출
        for moment in session.key_moments:
            if moment.get("stage") == "S2":
                situation = moment.get("content", "")
            if moment.get("stage") == "S3":
                selected_strategy = moment.get("content", "")
        
        # 2. 최종 행동카드 생성
        action_card = self.action_card_generator.generate_final_card(
            child_name=request.child_name,
            story_name=request.story_name,
            emotion=emotion,
            situation=situation,
            selected_strategy=selected_strategy,
            conversation_summary=conversation_summary
        )
        
        # 3. AI 응답 (마무리)
        ai_response = AISpeech(
            text=f"{request.child_name}아, 오늘 정말 잘했어! 행동카드를 만들었으니 언제든 사용해봐!",
            tts_url=None,
            duration_ms=None
        )
        
        # 4. 액션 아이템 (행동카드)
        action_items = ActionItems(
            type="action_card",
            instruction="행동카드가 만들어졌어요!"
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
            "action_items": action_items.dict(),
            "action_card": action_card.dict()
        }
    
    
    def _generate_empathic_response(
        self, child_name: str, child_text: str, emotion: str, context: Dict, stage: Stage
    ) -> AISpeech:
        """공감 응답 생성 (S1)"""
        story = context.get("story", {})
        character_name = story.get("character_name", "콩쥐")
        scene = story.get("scene", "")
        intro = story.get("intro", "")
        
        prompt = ChatPromptTemplate.from_messages([
            ("system", f"""
            너는 한국 전래동화 속 인물 '{character_name}'이야.
            현재 장면: {scene}

            너의 말투는 따뜻하고 다정하며, 어린이에게 공감과 이해를 표현해.
            규칙:
            1. 아이의 감정에 공감하는 한 문장 ("그랬구나", "그럴 수 있지" 등)
            2. 감정의 이유를 자연스럽게 묻는 질문 한 문장
            3. 두 문장 이내로 짧고 따뜻하게, 어린이 말투로
            """),
            ("user", f"""
            {character_name}가 아이에게 먼저 이렇게 말했어:
            "{intro}"

            아이({child_name})가 이렇게 대답했어:
            "{child_text}"

            감정 분석 결과: {emotion}

            {character_name}으로서 공감하며 대답해줘.
            """)
        ])
        
        response = self.llm.invoke(prompt.format_messages())
        return AISpeech(text=response.content.strip())
    
    ## _generate_ask_experience_question ##
    def _generate_ask_experience_question(
        self, child_name: str, context: Dict
    ) -> AISpeech:
        """원인 탐색 질문 생성 (S2)"""
        story = context.get("story", {})
        character_name = story.get("character_name", "콩쥐")
        
        prompt = ChatPromptTemplate.from_messages([
            ("system", f"""
            너는 '{character_name}'이야.
            아이에게 비슷한 경험이 있는지 물어봐.

            규칙:
            1. "비슷한 경험이 있어?" 형태의 질문
            2. 한 문장으로 간결하게
            3. 아이가 편하게 대답할 수 있는 분위기
            """),
            ("user", f"{child_name}이에게 비슷한 경험이 있는지 물어봐줘.")
            ])
            
        response = self.llm.invoke(prompt.format_messages())
        return AISpeech(text=response.content.strip())
                
                
    def _generate_strategy_suggestion(
        self, child_name: str, strategies: List[str], context: Dict
    ) -> AISpeech:
        """전략 제안 생성 (S3)"""
        story = context.get("story", {})
        character_name = story.get("character_name", "콩쥐")
        
        strategies_text = ", ".join(strategies)
        
        prompt = ChatPromptTemplate.from_messages([
            ("system", f"""
            너는 '{character_name}'이야.
            아이에게 행동 전략을 제안하고 선택하도록 유도해야 해.

            규칙:
            1. "그럴 때는 이런 방법들을 해볼 수 있어" 형태로 제안
            2. 두 문장 이내
            3. 격려하는 톤
            4. 아이의 나이에 맞는 제안
            """),
            
            ("user", f"""
                {child_name}이에게 이 방법들을 제안해줘:
                {strategies_text}

            어떤 걸 해볼지 선택하게 해줘.
            """)
        ])
        
        response = self.llm.invoke(prompt.format_messages())
        return AISpeech(text=response.content.strip())
    
    
    def _generate_lesson_connection(
        self, child_name: str, lesson: str, context: Dict
    ) -> AISpeech:
        """교훈 연결 생성 (S4)"""
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
    
    def _summarize_conversation(self, session: DialogueSession) -> str:
        """대화 요약"""
        moments = session.key_moments
        if not moments:
            return "대화 없음"
        
        summary_parts = []
        for moment in moments:
            summary_parts.append(f"{moment['stage']}: {moment['content']}")
        
        return " | ".join(summary_parts) 
    
    def _handle_safety_violation(self, safety_result: SafetyCheckResult) -> Dict:
        """안전 필터 위반 처리"""
        return {
            "stt_result": None,
            "safety_check": safety_result.dict(),
            "ai_response": AISpeech(text=safety_result.message).dict(),
            "action_items": ActionItems(
                type="open_question",
                instruction="다시 말해줄래?"
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

