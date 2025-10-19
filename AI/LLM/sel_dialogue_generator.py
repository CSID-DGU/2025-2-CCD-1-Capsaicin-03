# sel_dialogue_generator.py
from langchain_openai import ChatOpenAI
from langchain_core.prompts import (
    ChatPromptTemplate,
    MessagesPlaceholder,
    SystemMessagePromptTemplate,
    HumanMessagePromptTemplate,
)
from langchain.memory import ConversationSummaryBufferMemory
from langchain.chains import LLMChain
from langchain.memory import ConversationBufferMemory
import os
import pandas as pd
from langchain_core.output_parsers import StrOutputParser
from rouge_score import rouge_scorer
import re
import random

from openai import OpenAI
from sel_characters import SEL_CHARACTERS
from emotion_classifier import emotion_classify

# client = OpenAI()
# 입력받은 키로 OpenAI 클라이언트 생성
client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])

llm = ChatOpenAI(model="gpt-4.1-mini", api_key=os.environ["OPENAI_API_KEY"], temperature=0.7)


output_parser = StrOutputParser()

def second_ai(story_name: str, child_utterance: str):
    """
    아이 발화를 기반으로 감정 분석 + 공감 + 감정 되묻기 (intro와 자연스럽게 이어지도록 수정)
    """
    persona = SEL_CHARACTERS.get(story_name)
    if not persona:
        raise ValueError(f"{story_name}은(는) 등록되지 않은 동화책입니다.")

    character_name = persona["character_name"]
    scene = persona["scene"]
    intro = persona["intro"].strip()
    sel_skill = persona["sel_skill"]

    # 1️⃣ 아이 발화 감정 분석
    emotion = emotion_classify(child_utterance)

    # 2️⃣ 자연스러운 호응이 되도록 프롬프트 개선
    empathic_prompt = f"""
    당신은 한국 전래동화 속 인물 '{character_name}'입니다.
    현재 장면: {scene}
    SEL 역량: {sel_skill}

    상황 설명:
    {character_name}가 아이에게 다음과 같이 먼저 말을 걸었어요:
    "{intro}"

    아이는 그 말에 이렇게 대답했어요:
    "{child_utterance}"

    이 대답을 들은 {character_name}은 왜 자신이 그런 감정을 들었을 거라고 생각하는지 이유를 물어봅니다.

    감정 분석 결과: {emotion}

    다음 규칙을 지켜서 대답하세요:
    1. 아이의 말에 자연스럽게 이어지도록 반응합니다. (intro의 질문에 대한 답변으로 들리게)
    2. 먼저 공감 한 문장 ("그랬구나", "정말 그런 기분이 들 수 있지" 등)
    3. 이어서 감정의 이유를 부드럽게 되묻는 질문 한 문장 ("왜 그렇게 느꼈을 것 같아?" 등)
    4. 전체는 2문장 이하로 간결하고 따뜻하게 표현
    5. 어린이에게 말하듯 쉬운 어투로 이야기
    """

    completion = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "너는 감정적으로 따뜻한 동화 속 캐릭터로 아이와 대화한다."},
            {"role": "user", "content": empathic_prompt}
        ],
    )

    ai_reply = completion.choices[0].message.content.strip()

    # 결과 반환
    return f"{ai_reply}"



def generate_sel_dialogue(story_name: str, child_age: int, child_utterance: str):
    """
    캐릭터와 아이의 발화를 바탕으로 SAFE 구조 SEL 대화 생성
    """
    # 캐릭터 정보 조회
    persona = SEL_CHARACTERS.get(story_name)
    if not persona:
        raise ValueError(f"{story_name}은(는) 등록되지 않은 동화책입니다.")

    character_name = persona["character_name"]
    scene = persona["scene"]
    sel_skill = persona["sel_skill"]
    intro = persona.get("intro", "")  # 새로 추가: intro 텍스트

    # ===== 시스템 프롬프트 =====
    system_prompt = f"""
        당신은 한국 전래동화 속 인물 '{character_name}'입니다.
        현재 장면: {scene}
        목표 SEL 역량: {sel_skill}

        캐릭터 도입 대사:
        {intro}

        규칙:
        - SAFE 10턴 구조를 따른다.
        - 항상 AI({character_name})가 먼저 질문한다.
        - 6세 아이에게는 짧고 단순하게, 9세 아이에게는 구체적인 감정어와 관점 탐색을 활용한다.
        - 턴 3에서는 아이가 추측한 타인의 감정을 감정 단어로 라벨링한다.
        - 턴 7에서는 ‘괜찮아 말하기’, ‘도와주기’ 같은 공감 행동 전략을 제안한다.
        - 대화가 끝나면 아이가 고른 전략을 행동카드로 제시한다.
        """

    # ===== 사용자 프롬프트 =====
    user_prompt = f"""
        아이의 나이: {child_age}세
        아이의 발화: "{child_utterance}"

        위 도입 대사(intro)를 읽고, 이 발화를 시작점으로 SAFE 구조에 따라
        8~10턴의 대화를 만들어주세요. 
        대화에는 항상 AI가 먼저 질문하고, 아이가 대답한 후 다음 턴으로 이어지게 하며,
        끝에 행동카드를 생성하도록 해주세요.
        """

    # ===== OpenAI API 호출 =====
    completion = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
    )

    # 결과 반환
    return completion.choices[0].message.content.strip()
