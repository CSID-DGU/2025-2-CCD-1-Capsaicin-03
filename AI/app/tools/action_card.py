"""
TOOL 4: Action Card Generator
행동 카드 생성 (S3, S5에서 사용)
"""
from langchain.tools import tool
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from typing import Dict, List, Optional
import logging
import os

from app.models.schemas import ActionCard

logger = logging.getLogger(__name__)


class ActionCardGeneratorTool:
    """행동 카드 생성 도구"""
    
    def __init__(self, api_key: str = None):
        self.llm = ChatOpenAI(
            model="gpt-4o-mini",
            temperature=0.7,
            api_key=api_key or os.getenv("OPENAI_API_KEY")
        )
    
    def generate_draft(
        self,
        emotion: str,
        situation: str,
        child_name: str
    ) -> List[str]:
        """
        S3에서 사용: 행동 전략 초안 생성 (2-3개)
        
        Args:
            emotion: 감정 라벨
            situation: 상황 설명
            child_name: 아동 이름
        
        Returns:
            행동 전략 리스트 (12자 이내)
        """
        prompt = ChatPromptTemplate.from_messages([
            ("system", """
            너는 아동 SEL 교육 전문가야.
            아이가 {emotion} 감정을 느낄 때 사용할 수 있는 
            구체적이고 실천 가능한 행동 전략을 제안해야 해.

            규칙:
            1. 각 전략은 12자 이내로 작성
            2. 명령형 또는 행동형으로 작성 ("~하기", "~해보기")
            3. 오늘 당장 실천 가능한 간단한 행동
            4. 2-3개 전략 제시
            5. 아동(7-10세)이 이해하기 쉬운 표현
            """),
            
            ("user", """
            감정: {emotion}
            상황: {situation}
            아이 이름: {child_name}

            2-3개의 행동 전략을 제안해줘.
            형식: JSON 배열
            예시: ["심호흡 3번 하기", "10까지 세기", "물 한 컵 마시기"]
            """)
        ])
        
        try:
            response = self.llm.invoke(
                prompt.format_messages(
                    emotion=emotion,
                    situation=situation,
                    child_name=child_name
                )
            )
            
            content = response.content.strip()
            
            # JSON 파싱 시도
            import json
            # JSON 추출 (```json ... ``` 형태 처리)
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                content = content.split("```")[1].split("```")[0].strip()
            
            strategies = json.loads(content)
            
            # 12자 제한 검증
            strategies = [s[:12] for s in strategies]
            
            logger.info(f"행동 전략 초안 생성: {strategies}")
            return strategies[:3]
        
        except Exception as e:
            logger.error(f"행동 전략 생성 오류: {e}", exc_info=True)
            # Fallback 전략
            return self._get_fallback_strategies(emotion)
    
    def generate_final_card(
        self,
        child_name: str,
        story_name: str,
        emotion: str,
        situation: str,
        selected_strategy: Optional[str],
        conversation_summary: str
    ) -> ActionCard:
        """
        S5에서 사용: 최종 행동 카드 생성
        
        Args:
            child_name: 아동 이름
            story_name: 동화 제목
            emotion: 감정
            situation: 상황
            selected_strategy: 선택한 전략 (없으면 자동 생성)
            conversation_summary: 전체 대화 요약
        
        Returns:
            ActionCard
        """
        prompt = ChatPromptTemplate.from_messages([
            ("system", """
                너는 아동 SEL 교육 전문가이자 부모 코칭 전문가야.
                아이와의 대화를 바탕으로 행동 카드를 만들어야 해.

                행동 카드 구성:
                1. 제목: 15자 이내, 명령형 ("화났을 때 심호흡하기")
                2. 설명: 50자 이내, 구체적 행동 설명
                3. 아이콘: 이모지 1개 (행동을 상징)
                4. 부모 가이드: 3줄, 각 30자 이내
                - 1줄: 아이의 감정 설명
                - 2줄: 전략 사용 시기
                - 3줄: 부모의 격려 방법
                """),
            ("user", """
                아이 이름: {child_name}
                동화: {story_name}
                감정: {emotion}
                상황: {situation}
                선택한 전략: {strategy}
                대화 요약: {summary}

                위 정보를 바탕으로 행동 카드를 JSON 형식으로 생성해줘:
            {{
                "title": "15자 이내 제목",
                "description": "50자 이내 설명",
                "icon": "🌟",
                "parent_guide": ["가이드1", "가이드2", "가이드3"]
            }}
        """)
        ])
        
        try:
            response = self.llm.invoke(
                prompt.format_messages(
                    child_name=child_name,
                    story_name=story_name,
                    emotion=emotion,
                    situation=situation,
                    strategy=selected_strategy or "자동 생성",
                    summary=conversation_summary
                )
            )
            
            content = response.content.strip()
            
            # JSON 파싱
            import json
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                content = content.split("```")[1].split("```")[0].strip()
            
            card_data = json.loads(content)
            
            # 길이 제한 적용
            card_data["title"] = card_data["title"][:15]
            card_data["description"] = card_data["description"][:50]
            card_data["parent_guide"] = [g[:30] for g in card_data["parent_guide"][:3]]
            
            card = ActionCard(**card_data)
            
            logger.info(f"최종 행동 카드 생성: {card.title}")
            return card
        
        except Exception as e:
            logger.error(f"행동 카드 생성 오류: {e}", exc_info=True)
            # Fallback 카드
            return self._get_fallback_card(emotion)
    
    def _get_fallback_strategies(self, emotion: str) -> List[str]:
        """기본 전략 (오류 시)"""
        fallback_map = {
            "분노": ["심호흡 3번", "10까지 세기", "물 한 컵"],
            "슬픔": ["속상함 말하기", "안아주기", "좋은 기억"],
            "두려움": ["어른에게 말하기", "안전한 곳", "손 꼭 잡기"],
            "행복": ["웃으며 말하기", "감사 표현", "나눠주기"]
        }
        return fallback_map.get(emotion, ["천천히 말하기", "도움 요청", "쉬기"])
    
    def _get_fallback_card(self, emotion: str) -> ActionCard:
        """기본 카드 (오류 시)"""
        return ActionCard(
            title="감정 표현하기",
            description="내 마음을 천천히 말로 표현해봐요",
            icon="💬",
            parent_guide=[
                "아이가 감정을 말로 표현하고 있어요",
                "화났을 때 이 방법을 사용하도록 격려해주세요",
                "잘했어 라고 칭찬해주세요"
            ]
        )


# Singleton 인스턴스
_action_card_generator_instance = None

def get_action_card_generator() -> ActionCardGeneratorTool:
    """싱글톤 행동 카드 생성기 반환"""
    global _action_card_generator_instance
    if _action_card_generator_instance is None:
        _action_card_generator_instance = ActionCardGeneratorTool()
    return _action_card_generator_instance


# LangChain Tool 래퍼
@tool
def action_card_generator_tool(action: str, **kwargs) -> Dict:
    """
    행동 카드를 생성합니다.
    - draft: 2-3개 전략 초안 생성 (S3)
    - final: 최종 행동 카드 생성 (S5)
    
    Args:
        action: "draft" | "final"
        **kwargs: 액션별 파라미터
    
    Returns:
        dict: 생성 결과
    """
    generator = get_action_card_generator()
    
    if action == "draft":
        strategies = generator.generate_draft(
            emotion=kwargs.get("emotion", ""),
            situation=kwargs.get("situation", ""),
            child_name=kwargs.get("child_name", "")
        )
        return {"strategies": strategies}
    
    elif action == "final":
        card = generator.generate_final_card(
            child_name=kwargs.get("child_name", ""),
            story_name=kwargs.get("story_name", ""),
            emotion=kwargs.get("emotion", ""),
            situation=kwargs.get("situation", ""),
            selected_strategy=kwargs.get("selected_strategy"),
            conversation_summary=kwargs.get("conversation_summary", "")
        )
        return card.dict()
    
    return {"error": "Unknown action"}


if __name__ == "__main__":
    # 테스트
    generator = ActionCardGeneratorTool()
    
    # 초안 생성 (S3)
    print("=== 행동 전략 초안 ===")
    strategies = generator.generate_draft(
        emotion="분노",
        situation="선생님이 화를 내서 속상했어요",
        child_name="지민"
    )
    print(strategies)
    
    # 최종 카드 생성 (S5)
    print("\n=== 최종 행동 카드 ===")
    card = generator.generate_final_card(
        child_name="지민",
        story_name="콩쥐팥쥐",
        emotion="분노",
        situation="선생님이 화냈어요",
        selected_strategy="심호흡 3번",
        conversation_summary="선생님이 화를 내서 속상했고, 심호흡으로 마음을 진정시키기로 했습니다."
    )
    print(card)

