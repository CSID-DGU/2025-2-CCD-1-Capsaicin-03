"""
TOOL 1: Safety Filter
OpenAI Moderation API를 사용한 유해 콘텐츠 필터링
"""
import re
import unicodedata
from langchain.tools import tool
from openai import OpenAI
import os
import logging
from typing import Dict, List

from app.models.schemas import SafetyCheckResult

logger = logging.getLogger(__name__)


class SafetyFilterTool:
    """안전 필터 도구"""
    
    def __init__(self, api_key: str = None):
        self.client = OpenAI(api_key=api_key or os.getenv("OPENAI_API_KEY"))
        
        # 금칙어 파일 경로 환경변수 (서버용)
        badwords_path = os.getenv("BADWORDS_FILE_PATH")

        # 금칙어 로컬 파일 경로 (현재 파일 기준 상대 경로)
        if not badwords_path:
            badwords_path = os.path.join(
                os.path.dirname(os.path.abspath(__file__)),
                "korean_badwords.txt"
            )

        self.badwords = self._load_badwords(badwords_path)
        logger.info(f"[SAFETY] SafetyFilterTool 초기화 완료, 금칙어: {len(self.badwords)}개")
    
    def _load_badwords(self, filepath: str) -> List[str]:
        """금칙어 목록 로드"""
        badwords = []
        try:
            if not os.path.exists(filepath):
                logger.error(f"[SAFETY] 금칙어 파일이 존재하지 않음: {filepath}")
                return []
            
            with open(filepath, "r", encoding="utf-8") as f:
                raw = f.read()

            # 1) 쉼표로 나눔
            parts = raw.split(",")

            for word in parts:
                # 2) 양쪽 따옴표 및 공백 제거
                cleaned = word.strip().strip('"').strip("'").strip()

                if not cleaned:
                    continue

                # 3) 원본과 정규화된 버전 모두 추가
                badwords.append(cleaned)
                normalized = self._normalize(cleaned)
                if normalized and normalized != cleaned:
                    badwords.append(normalized)

            # 중복 제거
            badwords = list(set(badwords))
            logger.info(f"[SAFETY] 금칙어 {len(badwords)}개 로드 완료 (파일: {filepath})")
            return badwords

        except Exception as e:
            logger.error(f"[SAFETY] 금칙어 파일 로드 실패: {e}", exc_info=True)
            return []

    # ------------------------------
    #  텍스트 정규화
    # ------------------------------
    def _normalize(self, text: str) -> str:
        """텍스트 정규화 (특수문자 제거, 소문자 변환)"""
        if not text:
            return ""
        
        # 유니코드 정규화
        text = unicodedata.normalize('NFKD', text)

        # 한글·영문·숫자만 남기기 (공백, 특수문자 제거)
        text = re.sub(r"[^가-힣ㄱ-ㅎㅏ-ㅣa-zA-Z0-9]", "", text)

        # 소문자 변환
        text = text.lower()

        return text
    
    def contains_badword(self, text: str) -> tuple[bool, str]:
        """
        금칙어 포함 여부 확인
        
        Returns:
            (포함여부, 감지된 단어)
        """
        if not text:
            return False, ""
        
        # 원본 텍스트로 검사
        for badword in self.badwords:
            if badword in text:
                logger.warning(f"[SAFETY] 금칙어 감지 (원본): '{badword}' in '{text}'")
                return True, badword
        
        # 정규화된 텍스트로 검사
        normalized_text = self._normalize(text)
        for badword in self.badwords:
            normalized_badword = self._normalize(badword)
            if normalized_badword and normalized_badword in normalized_text:
                logger.warning(f"[SAFETY] 금칙어 감지 (정규화): '{badword}' in '{text}'")
                return True, badword
        
        return False, ""
    
    def check(self, text: str) -> SafetyCheckResult:
        """
        텍스트의 안전성 검사
        
        Args:
            text: 검사할 텍스트
        
        Returns:
            SafetyCheckResult: 안전성 검사 결과
        """
        try:
            logger.info(f"[SAFETY] 안전성 검사 시작: '{text}'")
            
            #########################################
            # (A) 1차 필터: 금칙어(Blacklist) 검사
            #########################################
            contains_bad, detected_word = self.contains_badword(text)
            if contains_bad:
                logger.warning(f"[SAFETY] ❌ 금칙어 감지됨: '{detected_word}' in '{text}'")
                flagged_categories = ["harassment", "profanity"]
                
                return SafetyCheckResult(
                    is_safe=False,
                    flagged_categories=flagged_categories,
                    message="그 말은 너무 거칠어서 사용하기 어려워. 다른 말로 이야기해볼까?"
                )
                
            #########################################
            # (B) 2차 필터: OpenAI Moderation
            #########################################    
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
                logger.warning(f"[SAFETY] ❌ OpenAI Moderation 감지: {flagged_categories}")
            else:
                logger.info(f"[SAFETY] ✅ 안전한 텍스트")
            
            return SafetyCheckResult(
                is_safe=is_safe,
                flagged_categories=flagged_categories,
                message=message
            )
        
        except Exception as e:
            logger.error(f"[SAFETY] ❌ 안전 필터 오류: {e}", exc_info=True)
            # 오류 시 안전하지 않음으로 간주 (보수적 접근)
            return SafetyCheckResult(
                is_safe=False,
                flagged_categories=["error"],
                message="잠깐, 다른 말로 해볼까?"
            )
    
    def _get_child_friendly_warning(self, categories: list) -> str:
        """
        아동 친화적 경고 메시지 생성
        - 아동의 감정을 인정하면서도 올바른 표현 방법을 안내
        - 교육적이면서도 공감적인 톤 유지
        """
        if "self_harm" in categories:
            return "많이 힘들구나. 그런 생각이 들 때는 꼭 어른에게 말해야 해. 지금은 나랑 이야기하면서 마음을 풀어보자. 어떤 일이 있었는지 천천히 말해줄래?"
        elif "violence" in categories:
            return "화가 많이 났구나. 하지만 그런 표현보다는 '화가 났어', '속상했어'라고 말하면 더 좋을 것 같아. 무슨 일이 있었는지 다시 말해줄래?"
        elif "hate" in categories or "hate_threatening" in categories:
            return "속상한 마음은 이해해. 하지만 친구나 다른 사람을 미워하는 말은 사용하지 않는 게 좋아. 대신 어떤 점이 속상했는지 말해볼까?"
        elif "harassment" in categories or "harassment_threatening" in categories:
            return "누군가를 괴롭히는 말은 듣는 사람도 말하는 사람도 마음이 아파. 다른 방식으로 이야기해볼 수 있을까?"
        elif "sexual" in categories:
            return "그 이야기는 조금 어려운 주제야. 우리는 동화 이야기로 돌아가자. 어떤 기분이 들었는지 말해줄래?"
        else:
            return "그 말은 조금 다르게 표현하면 더 좋을 것 같아. 다시 이야기해줄 수 있을까?"


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

