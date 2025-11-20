"""
TOOL 1: Safety Filter
OpenAI Moderation API를 사용한 유해 콘텐츠 필터링
"""
from langchain.tools import tool
from openai import OpenAI
import os
import logging
from typing import Dict

from app.models.schemas import SafetyCheckResult

logger = logging.getLogger(__name__)


class SafetyFilterTool:
    """안전 필터 도구"""
    
    def __init__(self, api_key: str = None):
        self.client = OpenAI(api_key=api_key or os.getenv("OPENAI_API_KEY"))
    
    def check(self, text: str) -> SafetyCheckResult:
        """
        텍스트의 안전성 검사
        
        Args:
            text: 검사할 텍스트
        
        Returns:
            SafetyCheckResult: 안전성 검사 결과
        """
        try:
            response = self.client.moderations.create(
                model="omni-moderation-latest",
                input=text
            )
            result = response.results[0]
            categories = result.categories
            
            # 위반 카테고리 수집
            flagged_categories = []
            if categories.self_harm:
                flagged_categories.append("self_harm")
            if categories.sexual:
                flagged_categories.append("sexual")
            if categories.hate:
                flagged_categories.append("hate")
            if categories.hate_threatening:
                flagged_categories.append("hate_threatening")
            if categories.harassment:
                flagged_categories.append("harassment")
            if categories.harassment_threatening:
                flagged_categories.append("harassment_threatening")
            if categories.violence:
                flagged_categories.append("violence")
            
            is_safe = len(flagged_categories) == 0
            
            # 경고 메시지 생성
            message = None
            if not is_safe:
                message = self._get_child_friendly_warning(flagged_categories)
            
            logger.info(
                f"안전 필터 결과: is_safe={is_safe}, "
                f"flagged={flagged_categories}"
            )
            
            return SafetyCheckResult(
                is_safe=is_safe,
                flagged_categories=flagged_categories,
                message=message
            )
        
        except Exception as e:
            logger.error(f"안전 필터 오류: {e}", exc_info=True)
            # 오류 시 안전하지 않음으로 간주 (보수적 접근)
            return SafetyCheckResult(
                is_safe=False,
                flagged_categories=["error"],
                message="잠깐, 다른 말로 해볼까?"
            )
    
    def _get_child_friendly_warning(self, categories: list) -> str:
        """아동 친화적 경고 메시지 생성"""
        if "self_harm" in categories:
            return "힘든 일이 있구나. 나랑 차근차근 이야기해볼까?"
        elif "violence" in categories or "hate" in categories:
            return "그런 표현은 조금 위험할 수 있어. 다른 말로 이야기해줄래?"
        elif "sexual" in categories:
            return "그 이야기는 다음에 하자. 다른 이야기 해볼까?"
        else:
            return "조금 다르게 말해볼 수 있을까?"


# LangChain Tool 래퍼
@tool
def safety_filter_tool(text: str) -> Dict:
    """
    아동 발화의 안전성을 검사합니다.
    유해 콘텐츠(폭력, 자해, 혐오 등)를 감지합니다.
    
    Args:
        text: 검사할 텍스트
    
    Returns:
        dict: {"is_safe": bool, "flagged_categories": list, "message": str}
    """
    filter_tool = SafetyFilterTool()
    result = filter_tool.check(text)
    return result.dict()


if __name__ == "__main__":
    # 테스트
    tool = SafetyFilterTool()
    
    test_cases = [
        "선생님이 나한테 화났어요",  # Safe
        "죽고 싶어",                # Unsafe (self-harm)
        "너 때문에 짜증나"           # Safe (일상 표현)
    ]
    
    for text in test_cases:
        result = tool.check(text)
        print(f"입력: {text}")
        print(f"결과: {result}")
        print("-" * 50)

