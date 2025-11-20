"""
TOOL 2: Emotion Classifier
GPT-4o-mini 기반 감정 분류기
"""
from langchain.tools import tool
from langchain_openai import ChatOpenAI
from langchain_core.output_parsers import JsonOutputParser
from langchain_core.prompts import ChatPromptTemplate
import logging
from typing import Dict, List
import json
import os

from app.models.schemas import EmotionResult, EmotionLabel

logger = logging.getLogger(__name__)


class EmotionClassifierTool:
    """감정 분류 도구 (GPT 기반)"""
    
    # 감정 라벨 매핑
    LABEL_MAPPING = {
        "기쁨": EmotionLabel.HAPPY,
        "행복": EmotionLabel.HAPPY,
        "슬픔": EmotionLabel.SAD,
        "분노": EmotionLabel.ANGRY,
        "화남": EmotionLabel.ANGRY,
        "공포": EmotionLabel.FEAR,
        "두려움": EmotionLabel.FEAR,
        "무서움": EmotionLabel.FEAR,
        "놀람": EmotionLabel.SURPRISE,
        "혐오": EmotionLabel.DISGUST,
        "중립": EmotionLabel.NEUTRAL,
        "무감정": EmotionLabel.NEUTRAL
    }
    
    def __init__(self, api_key: str = None):
        """
        감정 분류기 초기화 (GPT 기반)
        
        Args:
            api_key: OpenAI API 키
        """
        logger.info("감정 분류기 초기화 (GPT-4o-mini)")
        
        self.llm = ChatOpenAI(
            model="gpt-4o-mini",
            temperature=0.3,  # 일관성을 위해 낮은 temperature
            api_key=api_key or os.getenv("OPENAI_API_KEY")
        )
        
        logger.info("감정 분류기 초기화 완료")
    
    def classify(self, text: str) -> EmotionResult:
        """
        텍스트에서 감정 분류
        
        Args:
            text: 분류할 텍스트 (아동 발화)
        
        Returns:
            EmotionResult: 감정 분류 결과
        """
        try:
            parser = JsonOutputParser(pydantic_object=EmotionResult)
            prompt = ChatPromptTemplate.from_messages([
                ("system", """
                    너는 아동 심리 전문가로서 아이의 발화에서 감정을 정확히 분류해야 해.

                    6가지 기본 감정:
                    1. 행복 (기쁨, 즐거움, 만족)
                    2. 슬픔 (속상함, 우울, 외로움)
                    3. 분노 (화남, 짜증, 억울함)
                    4. 두려움 (무서움, 불안, 걱정)
                    5. 놀람 (신기함, 당황, 의외)
                    6. 중립 (감정 표현 없음)

                    규칙:
                    - 주 감정 1개는 반드시 선택
                    - 부 감정은 0-2개 (확실한 경우만)
                    - 신뢰도는 0.0~1.0 사이

                    다음 스키마를 엄격하게 따르세요.
                    {format_instructions}
                    
                """),
                ("user", "아이의 발화: \"{text}\"\n\n이 아이의 감정을 분석해줘.")
            ])
            
            response = self.llm.invoke(prompt.format_messages(text=text, format_instructions=parser.get_format_instructions()))
            print(response)
            result = parser.parse(response.content)
            print(result)

            # EmotionLabel로 변환
            # print(result)
            primary_emotion = self._map_to_emotion_label(result["primary"])
            secondary_emotions = [
                self._map_to_emotion_label(e) 
                for e in result.get("secondary", [])
            ]
            confidence = float(result.get("confidence", 0.8))
            
            logger.info(
                f"감정 분류 완료: primary={primary_emotion.value}({confidence:.2f}), "
                f"secondary={[e.value for e in secondary_emotions]}, "
                f"reasoning={result.get('reasoning', '')}"
            )
            
            return EmotionResult(
                primary=primary_emotion,
                secondary=secondary_emotions[:2],
                confidence=confidence,
                raw_scores={
                    primary_emotion.value: confidence
                }
            )
        
        except Exception as e:
            logger.error(f"감정 분류 오류: {e}", exc_info=True)
            # Fallback: 간단한 키워드 기반 분류
            return self._fallback_classify(text)
    
    def _map_to_emotion_label(self, label_text: str) -> EmotionLabel:
        """텍스트를 EmotionLabel로 매핑"""
        label_text = label_text.strip()
        
        # 직접 매핑
        for key, value in self.LABEL_MAPPING.items():
            if key in label_text or label_text in key:
                return value
        
        # Enum 값 직접 매핑
        for emotion in EmotionLabel:
            if emotion.value in label_text or label_text in emotion.value:
                return emotion
        
        logger.warning(f"알 수 없는 감정 라벨: {label_text}, 중립으로 처리")
        return EmotionLabel.NEUTRAL
    
    def _fallback_classify(self, text: str) -> EmotionResult:
        """
        GPT 실패 시 간단한 키워드 기반 분류
        """
        text_lower = text.lower()
        
        # 키워드 기반 감정 감지
        emotion_keywords = {
            EmotionLabel.HAPPY: ["기쁘", "좋아", "행복", "즐거", "신나", "재밌"],
            EmotionLabel.SAD: ["슬프", "속상", "우울", "외로", "서러"],
            EmotionLabel.ANGRY: ["화", "짜증", "억울", "열받", "싫"],
            EmotionLabel.FEAR: ["무서", "불안", "걱정", "두려"],
            EmotionLabel.SURPRISE: ["놀라", "신기", "당황", "헉"],
        }
        
        detected_emotions = []
        for emotion, keywords in emotion_keywords.items():
            if any(keyword in text_lower for keyword in keywords):
                detected_emotions.append(emotion)
        
        if detected_emotions:
            primary = detected_emotions[0]
            secondary = detected_emotions[1:3] if len(detected_emotions) > 1 else []
            confidence = 0.6  # 낮은 신뢰도
        else:
            primary = EmotionLabel.NEUTRAL
            secondary = []
            confidence = 0.5
        
        logger.warning(f"Fallback 분류 사용: {primary.value}")
        
        return EmotionResult(
            primary=primary,
            secondary=secondary,
            confidence=confidence,
            raw_scores={}
        )
    
    def _get_default_emotion(self) -> EmotionResult:
        """기본 감정 (오류 시)"""
        return EmotionResult(
            primary=EmotionLabel.NEUTRAL,
            secondary=[],
            confidence=0.0,
            raw_scores={}
        )


# Singleton 인스턴스 (모델 로딩 비용 절감)
_emotion_classifier_instance = None

def get_emotion_classifier() -> EmotionClassifierTool:
    """싱글톤 감정 분류기 반환"""
    global _emotion_classifier_instance
    if _emotion_classifier_instance is None:
        _emotion_classifier_instance = EmotionClassifierTool()
    return _emotion_classifier_instance


# LangChain Tool 래퍼
@tool
def emotion_classifier_tool(text: str) -> Dict:
    """
    아동 발화에서 감정을 분류합니다.
    6가지 기본 감정(행복, 슬픔, 분노, 두려움, 놀람, 혐오)을 감지합니다.
    중립은 제외합니다.
    
    Args:
        text: 분류할 텍스트
    
    Returns:
        dict: {"primary": str, "secondary": list, "confidence": float}
    """
    classifier = get_emotion_classifier()
    result = classifier.classify(text)
    return result.dict()


if __name__ == "__main__":
    # 테스트
    classifier = EmotionClassifierTool()
    
    test_cases = [
        "선생님이 저한테 화났어요",
        "친구가 생겨서 정말 기뻐요",
        "무서워요, 어두워요",
        "별로 안 좋아요"
    ]
    
    for text in test_cases:
        result = classifier.classify(text)
        print(f"입력: {text}")
        print(f"주 감정: {result.primary.value} ({result.confidence:.2f})")
        print(f"부 감정: {[e.value for e in result.secondary]}")
        print("-" * 50)

