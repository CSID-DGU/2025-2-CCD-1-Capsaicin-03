"""
TTS (Text-to-Speech) Service
Supertone API를 사용하여 텍스트를 음성으로 변환
"""
import requests
import os
import logging
from typing import Optional, Dict
import uuid
from pathlib import Path
import base64

logger = logging.getLogger(__name__)

class TTSService:
    """
    TTS 서비스
    - Supertone API를 사용하여 텍스트를 음성(.wav)으로 변환
    - 생성된 음성 파일을 저장하고 경로 반환
    """
    
    def __init__(self, api_key: str = None):
        """
        Args:
            api_key: Supertone API Key (환경변수 SUPERTONE_API_KEY 또는 직접 입력)
        """
        self.api_key = api_key or os.getenv("SUPERTONE_API_KEY")
        self.base_url = "https://supertoneapi.com/v1"
        self.headers = {
            "x-sup-api-key": self.api_key
        }
        
        # 음성 파일 저장 디렉토리 설정
        self.audio_dir = Path("generated_audio")
        self.audio_dir.mkdir(exist_ok=True)
        
        # 기본 voice_id (캐싱용)
        self._default_voice_id = None
        
        logger.info("TTSService 초기화 완료")
    
    def get_voice_id(self, voice_name: str = "Aiden") -> str:
        """
        보이스 이름으로 voice_id 조회
        
        Args:
            voice_name: 사용할 보이스 이름 (기본값: "Aiden" - 어린 목소리)
        
        Returns:
            voice_id: Supertone voice ID
        """
        # 캐싱된 voice_id가 있으면 재사용
        if self._default_voice_id and voice_name == "Aiden":
            return self._default_voice_id
        
        try:
            # 보이스 목록 조회
            voices_url = f"{self.base_url}/voices/search"
            response = requests.get(voices_url, headers=self.headers)
            
            if response.status_code != 200:
                logger.error(f"보이스 목록 조회 실패: {response.status_code} {response.text}")
                raise Exception(f"보이스 목록 조회 실패: {response.status_code}")
            
            voices = response.json()
            
            # 이름으로 voice_id 찾기
            for voice in voices.get("items", []):
                if voice["name"].lower() == voice_name.lower():
                    voice_id = voice["voice_id"]
                    
                    # Aiden인 경우 캐싱
                    if voice_name == "Aiden":
                        self._default_voice_id = voice_id
                    
                    logger.info(f"보이스 '{voice_name}' ID 조회 완료: {voice_id}")
                    return voice_id
            
            # 보이스를 찾지 못한 경우
            logger.error(f"보이스 '{voice_name}'을 찾을 수 없습니다")
            raise Exception(f"보이스 '{voice_name}'을 찾을 수 없습니다")
        
        except Exception as e:
            logger.error(f"보이스 ID 조회 중 오류: {e}")
            raise
    
    def text_to_speech(
        self,
        text: str,
        voice_name: str = "Aiden",  # 어린 남성 보이스 (아동에 가까운 목소리)
        language: str = "ko",
        style: str = "neutral",
        model: str = "sona_speech_1"
    ) -> Dict[str, str]:
        """
        텍스트를 음성으로 변환하고 파일로 저장
        
        Args:
            text: 변환할 텍스트
            voice_name: 사용할 보이스 이름 (기본값: "Aiden" - 어린 목소리)
            language: 언어 코드 (기본값: "ko")
            style: 말하기 스타일 (기본값: "neutral")
            model: 사용할 TTS 모델 (기본값: "sona_speech_1")
        
        Returns:
            {
                "file_path": "생성된 음성 파일 경로",
                "file_url": "파일 URL (서버에서 접근 가능한 경로)",
                "duration_ms": "음성 길이 (밀리초, 추정값)"
            }
        """
        try:
            # 1. voice_id 조회
            voice_id = self.get_voice_id(voice_name)
            
            # 2. TTS 요청
            tts_url = f"{self.base_url}/text-to-speech/{voice_id}"
            tts_data = {
                "text": text,
                "language": language,
                "style": style,
                "model": model
            }
            
            logger.info(f"TTS 요청: text='{text[:50]}...', voice={voice_name}")
            
            response = requests.post(tts_url, headers=self.headers, json=tts_data)
            
            if response.status_code != 200:
                logger.error(f"TTS 생성 실패: {response.status_code} {response.text}")
                raise Exception(f"TTS 생성 실패: {response.status_code}")
            
            # 3. 파일 저장 및 Base64 인코딩
            # 고유한 파일명 생성 (UUID + timestamp)
            file_id = str(uuid.uuid4())
            file_name = f"tts_{file_id}.wav"
            file_path = self.audio_dir / file_name
            
            audio_bytes = response.content
            
            # 파일로 저장 (백업용)
            with open(file_path, "wb") as f:
                f.write(audio_bytes)
            
            # Base64 인코딩
            audio_base64 = base64.b64encode(audio_bytes).decode('utf-8')
            
            # 4. 음성 길이 추정 (대략 150자/분 = 2.5자/초 → 400ms/자)
            estimated_duration_ms = int(len(text) * 400)
            
            logger.info(f"TTS 음성 파일 생성 완료: {file_path}, 크기: {len(audio_bytes)} bytes, Base64 길이: {len(audio_base64)}")
            
            # 5. 파일 URL 및 Base64 반환
            file_url = f"/audio/{file_name}"
            
            return {
                "file_path": str(file_path),
                "file_url": file_url,
                "audio_base64": audio_base64,
                "duration_ms": estimated_duration_ms
            }
        
        except Exception as e:
            logger.error(f"TTS 변환 중 오류: {e}")
            raise
    
    def delete_audio_file(self, file_path: str):
        """
        생성된 음성 파일 삭제
        
        Args:
            file_path: 삭제할 파일 경로
        """
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
                logger.info(f"음성 파일 삭제 완료: {file_path}")
        except Exception as e:
            logger.warning(f"음성 파일 삭제 실패: {file_path}, 오류: {e}")


# 싱글톤 인스턴스
_tts_service_instance = None

def get_tts_service() -> TTSService:
    """TTSService 싱글톤 인스턴스 반환"""
    global _tts_service_instance
    if _tts_service_instance is None:
        _tts_service_instance = TTSService()
    return _tts_service_instance
