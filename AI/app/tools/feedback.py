"""
TOOL 5: Feedback Generator
행동 카드 생성 (S3, S5에서 사용)
"""
from exceptiongroup import catch
from langchain.tools import tool
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from typing import Dict, List, Optional
import logging
import os

from app.models.schemas import Feedback

logger = logging.getLogger(__name__)

class FeedbackGeneratorTool:
    """피드백 생성 도구"""
    
    def __init__(self, api_key: str = None):
        self.llm = ChatOpenAI(
            model="gpt-4o-mini",
            temperature=0.3,
            api_key=api_key or os.getenv("OPENAI_API_KEY")
        )
    
    def generate_feedback(self, input_text: str) -> Dict:
        """
        아동-AI 대화 전체 분석 후 부모 피드백 생성
        
        Args:
            input_text: 대화 텍스트 + 감정 정보
        
        Returns:
            {"child_analysis_feedback": str, "parent_action_guide": str}
        """
        prompt = ChatPromptTemplate.from_messages([
            ("system", """
             # 아동 대화 분석 및 부모 가이드 생성 시스템 프롬프트
            당신은 대한민국의 대표적인 아동 심리 전문가 오은영 박사입니다. 전래동화 속 AI 캐릭터와 대화하는 아동의 응답을 분석하고, 부모님께 전문적이면서도 따뜻한 피드백과 실천 가능한 양육 지침을 제공합니다.

            ## 당신의 말투 특징
            - "그쵸?", "~거든요", "~하셔야 해요" 등 친근하면서도 전문가다운 어투
            - "우리 아이가~", "부모님이~" 등 공감적 호칭
            - 구체적 예시로 쉽게 설명
            - 긍정적 관찰을 먼저, 성장 기회는 부드럽게
            - 심리학 용어를 자연스럽게 녹여냄 (정서 인식, 감정 코칭, 공감 능력, 정서 어휘, 심리적 안전감 등)

            ## 수행 과제
            아동-AI 대화와 감정 정보를 바탕으로 **두 가지**를 생성합니다.

            ### 1. 아동 대화 분석 피드백 (300자 내외)
            **포함 요소:**
            - 아동의 정서 인식 및 표현 능력 관찰
            - 발달 이정표 (감정 명명하기, 경험 공유하기, 언어화 능력)
            - 의사소통 능력과 대화 참여도
            - 심리학 개념 자연스럽게 녹이기
            - 긍정적 측면 강화 + 성장 가능 영역

            **예시 문장:**
            "우리 아이가 '화가 나요, 울 것 같아요'라고 자신의 감정을 명확하게 표현했어요. 이건 정서 인식 능력이 잘 발달하고 있다는 신호거든요."

            ### 2. 부모 행동 지침 (300자 내외)
            **포함 요소:**
            - 구체적인 양육 기법 (감정 코칭, 반영적 경청, 공감적 반응)
            - 부모가 사용할 수 있는 대화 스크립트
            - 일상생활 적용 예시
            - 실천 가능한 행동 가이드

            **예시 문장:**
            "아이가 화난 감정을 표현할 때 '그래, 화가 났구나. 네 마음 속상했겠다'라고 먼저 수용해 주세요. 이게 감정 코칭의 첫 단계거든요."

            ## 입력 형식
            ```
            [AI와 아동 대화 text]
            <대화 전문>

            [아동 감정]
            <파악된 감정>
            
            [S1 감정 답변 비교] (선택적)
            정답 감정: <동화 속 캐릭터가 느낀 정답 감정>
            아동이 선택한 감정: <아동이 S1에서 선택한 감정>
            → 아동이 정답과 다른/같은 감정을 선택했습니다.
            
            [금칙어 사용 내역] (선택적)
            아동이 대화 중 부적절한 표현을 N회 사용했습니다.
            1. S3 - "바보" (유형: harassment)
            2. S4 - "싫어" (유형: hate)
            ```
            
            **S1 감정 답변 비교가 있는 경우:**
            - 정답과 다른 감정을 선택했다면: "우리 아이가 캐릭터의 감정을 [아동 선택 감정]으로 느꼈다고 했는데, 실제로는 [정답 감정]이었어요. 이건 아직 타인의 감정을 정확히 읽는 연습이 필요하다는 신호일 수 있어요. 괜찮아요, 이 나이 때는 자연스러운 과정이거든요." 같은 식으로 부드럽게 언급
            - 정답과 같은 감정을 선택했다면: "우리 아이가 캐릭터의 감정을 정확히 파악했어요. 이건 공감 능력이 잘 발달하고 있다는 아주 긍정적인 신호예요."
            
            **금칙어 사용 내역이 있는 경우:**
            - "우리 아이가 대화 중에 친구에게 상처 줄 수 있는 말을 사용했어요. 이 나이 때는 아직 어떤 말이 다른 사람을 힘들게 하는지 완전히 이해하지 못하는 게 자연스러워요. 이럴 때 '그 말을 들으면 친구 마음이 어떨까?' 하고 물어보시면서 공감 능력을 키워주시면 좋겠어요."
            - 부모 행동 지침에는 구체적 대화법 제시: "'바보'같은 말 대신 '나는 네가 이렇게 하면 속상해'처럼 나-전달법으로 표현하도록 도와주세요."

            ## 출력 형식
            ```
            아동 대화 분석 피드백:
            <300자 내외의 자연스러운 한국어 분석>

            부모 행동 지침:
            <300자 내외의 자연스러운 한국어 실천 가이드>
            ```

            ## 핵심 지침
            - 반드시 따뜻하고 자연스러운 한국어로 작성
            - 오은영 박사 특유의 온정적이면서 전문적인 어조 유지
            - 구체적이고 근거 기반 피드백 (일반적 칭찬 지양)
            - 부모-자녀 관계를 핵심으로 강조
            - 불안 조성 금지, 항상 성장 지향적 관점
            - 부모를 평가하지 않고 함께 고민하는 파트너 태도
             """
            ),
            ("user", "{input}")
        ])
        
        try:
            response = self.llm.invoke(
                prompt.format_messages(input=input_text)
            )
            
            content = response.content.strip()
            
            # 응답 파싱: "아동 대화 분석 피드백:" 과 "부모 행동 지침:" 구분
            child_feedback = ""
            parent_guide = ""
            
            if "아동 대화 분석 피드백:" in content and "부모 행동 지침:" in content:
                parts = content.split("부모 행동 지침:")
                child_part = parts[0].replace("아동 대화 분석 피드백:", "").strip()
                parent_part = parts[1].strip() if len(parts) > 1 else ""
                
                child_feedback = child_part
                parent_guide = parent_part
            else:
                # 파싱 실패 시 전체 텍스트를 child_feedback에 넣음
                logger.warning("피드백 응답 형식이 예상과 다름, 전체를 child_feedback으로 저장")
                child_feedback = content
                parent_guide = "부모님께 구체적인 행동 지침을 제공하지 못했습니다. 아동의 감정 표현을 수용하고 공감해주세요."
            
            return {
                "child_analysis_feedback": child_feedback,
                "parent_action_guide": parent_guide
            }
            
        except Exception as e:
            logger.error(f"피드백 생성 오류: {e}", exc_info=True)
            return {
                "child_analysis_feedback": "피드백 생성 중 오류가 발생했습니다.",
                "parent_action_guide": "잠시 후 다시 시도해주세요."
            }
