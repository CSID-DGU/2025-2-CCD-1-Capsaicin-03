from transformers import AutoTokenizer, AutoModelForSequenceClassification, pipeline

# 모델과 토크나이저 로드
model_name = "Jinuuuu/KoELECTRA_fine_tunning_emotion"  # 또는 "dlckdfuf141/korean-emotion-kluebert-v2"
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForSequenceClassification.from_pretrained(model_name)

# 감정 분류 파이프라인 생성
emotion_classifier = pipeline("text-classification", model=model, tokenizer=tokenizer)

def emotion_classify(utterance):
    """
    아동 발화를 입력받아 감정을 라벨링하는 함수
    """
    result = emotion_classifier(utterance)
    return result[0]['label']

# 예시 사용
# utterance = "기분이 좀 그래요"
# emotion = emotion_classify(utterance)
# print(f"발화: {utterance}")
# print(f"예측 감정: {emotion}")
# print(f"예측 감정: {emotion} (확률: {confidence:.2f})")
