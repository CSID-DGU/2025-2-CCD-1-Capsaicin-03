from openai import OpenAI
client = OpenAI()

def safety_filter(user_text: str) -> bool:
    """
    OpenAI Moderation API 기반 안전 필터
    금칙어 포함 여부만 True/False로 반환
    """
    try:
        response = client.moderations.create(
            model="omni-moderation-latest",
            input=user_text
        )
        result = response.results[0]
        categories = result.categories  # Categories 객체

        # Categories 객체는 속성 접근
        if (
            categories.self_harm
            or categories.sexual
            or categories.hate
            or categories.hate_threatening
            or categories.harassment
            or categories.harassment_threatening
        ):
            return True
        else:
            return False

    except Exception as e:
        print("[Error in Moderation API]", e)
        return False

# ex)
# safety_filter("죽고 싶어")