import sounddevice as sd
import numpy as np
import whisper
import queue
import tempfile
import os
import wave

# ===== Whisper 모델 로드 =====
model = whisper.load_model("medium")  # 속도와 정확도 균형

# ===== 음성 녹음 설정 =====
SAMPLE_RATE = 16000  # Whisper 권장 샘플링
CHANNELS = 1
RECORD_SECONDS = 15   # 한 번에 녹음할 길이

audio_queue = queue.Queue()

# ===== 마이크 입력 콜백 =====
def audio_callback(indata, frames, time, status):
    if status:
        print(f"[마이크 오류] {status}")
    audio_queue.put(indata.copy())
    
    # ===== 녹음 후 Whisper 처리 함수 =====
def get_child_speech():
    print("🎤 마이크에서 음성을 듣고 있습니다... 5초간 말해보세요.")
    frames = []

    with sd.InputStream(
        samplerate=SAMPLE_RATE,
        channels=CHANNELS,
        callback=audio_callback
    ):
        for _ in range(int(SAMPLE_RATE / 1024 * RECORD_SECONDS)):
            frames.append(audio_queue.get())

    # numpy 배열로 변환
    audio_data = np.concatenate(frames, axis=0)

    # 임시 WAV 파일로 저장
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmpfile:
        wav_path = tmpfile.name
        with wave.open(wav_path, 'w') as wf:
            wf.setnchannels(CHANNELS)
            wf.setsampwidth(2)  # 16bit
            wf.setframerate(SAMPLE_RATE)
            wf.writeframes((audio_data * 32767).astype(np.int16).tobytes())

    # Whisper로 STT
    result = model.transcribe(wav_path, language="ko")
    os.remove(wav_path)
    text = result.get("text", "").strip()
    return text

# ===== 테스트 =====
if __name__ == "__main__":
    transcript = transcribe_live()
    print("📝 인식 결과:", transcript)
