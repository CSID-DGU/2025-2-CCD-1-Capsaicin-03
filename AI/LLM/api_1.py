from fastapi import FastAPI, File, Form, UploadFile, HTTPException
from pydantic import BaseModel
from pathlib import Path
import openai
import uuid
import shutil
import traceback
from datetime import datetime
from sel_characters import SEL_CHARACTERS
from sel_dialogue_generator import second_ai
from safety_filter import safety_filter

from sel_dialogue_generator import ask_experience

from sel_dialogue_generator import give_advice

from sel_dialogue_generator import action_card

import os


import subprocess
import tempfile

# ✅ ffmpeg 경로 먼저 설정
ffmpeg_path = r"C:\ffmpeg\bin\ffmpeg.exe"
os.environ["PATH"] = r"C:\ffmpeg\bin;" + os.environ["PATH"]
os.environ["IMAGEIO_FFMPEG_EXE"] = ffmpeg_path

# ✅ whisper는 PATH 설정 이후에 import
import whisper


app = FastAPI()

@app.post("/api/conversations")
async def continue_conversation(
    story_name: str = Form(...),
    child_name: str = Form(...),
    ai_intro: str = Form(...),
    turn: int = Form(...),
    # child_text: str = Form(...)
    child_file: UploadFile = File(...)
):

    # Whisper 실행
    model = whisper.load_model("medium")
    
    # 2️⃣ 업로드된 파일을 임시 경로에 저장
    with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as temp_audio:
        temp_audio.write(await child_file.read())
        temp_audio_path = temp_audio.name

    # 3️⃣ Whisper로 파일 경로 전달
    result = model.transcribe(temp_audio_path)
    child_text = result["text"]

    # 4️⃣ 임시 파일 삭제
    os.remove(temp_audio_path)
    
    # audio_path = f"{child_file}"
    # result = model.transcribe(audio_path)
    # print(result["text"])

    
    print(f"동화제목: {story_name}")
    character_name = SEL_CHARACTERS[story_name]['character_name']
    scene = SEL_CHARACTERS[story_name]['scene']
    print(f"장면: {scene}")
    print(f"{character_name}: {child_name + ' 아(야) ' + SEL_CHARACTERS[story_name]['intro']}")
    
    # intro = SEL_CHARACTERS[story_name]['intro']
    # ffmpeg 경로 강제 등록
    ffmpeg_path = r"C:\ffmpeg\bin\ffmpeg.exe"
    os.environ["PATH"] = r"C:\ffmpeg\bin;" + os.environ["PATH"]
    os.environ["IMAGEIO_FFMPEG_EXE"] = ffmpeg_path

    # ffmpeg 확인
    # subprocess.run([ffmpeg_path, "-version"])
    # Whisper용 임시 파일 저장
    # with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as temp_audio:
    #     contents = await child_file.read()
    #     temp_audio.write(contents)
    #     temp_audio_path = temp_audio.name  # Whisper는 파일 경로를
        
    # # Whisper 실행
    # model = whisper.load_model("base")
    # result = model.transcribe(temp_audio_path)
    # child_text = result["test"]
    # print("결과:", child_text)
    
    # # 파일 삭제
    # os.remove(temp_audio_path)
    
    # if not child_text:
    #     raise ValueError(" 음성 파일에서 텍스트를 추출하지 못했습니다.")

    # print(f"🎤 인식된 텍스트: {child_text}")

    if(turn==2):
        # child_text = input("아이의 첫번째 대답:").strip()
        unsafe = safety_filter(child_text)
        
        ai_text, emotion = second_ai(child_name, story_name, child_text)
        if unsafe:
            ai_text += "하지만 그런 말 하면 안돼~"           
        # 아이가 감정을 추정한 것을 듣고 AI가 그 이유를 물어봄    
        print(ai_text)
    
    
    if(turn==3):
        # 아이가 이유를 말함
        # child_answer = input("아이의 두번째 대답:").strip()
        print(child_text)
        # AI가 아이에게 그런 감정이 든 유사한 경험을 물어봄
        ai_third_text = ask_experience(story_name, child_text);  
        print(ai_third_text)
    
    if(turn==4):
        # 아이가 유사한 경험을 말함
        # child_answer = input("아이의 세번째 대답:").strip()
        print(child_text)
        # 구체적 행동 전략 제안(심호흡 3번 하기) 
        # ex) 다음에는 그런 일 있으면 심호흡 3번 해볼까?
        ai_fourth_text = give_advice(story_name, child_text);  
        print(ai_fourth_text)
    
    # AI가 행동카드 제공
    if(turn==5):
        # 아이가 알겠다/싫다 대답
        # child_answer = input("아이의 네번째 대답:").strip()
        print(child_text)
        # 행동카드 제공
        ai_fifth_text = action_card(story_name, child_text);  
        print(ai_fifth_text)


# if __name__ == "__main__":
#     continue_conversation() 