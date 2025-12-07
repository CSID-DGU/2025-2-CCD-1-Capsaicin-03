"""
STT Service: Whisper API를 사용한 음성 인식
"""
import tempfile
import os
import logging
from openai import OpenAI

from app.models.schemas import STTResult

logger = logging.getLogger(__name__)


class STTService:
    """음성 인식 서비스"""
    
    def __init__(self, api_key: str = None):
        self.client = OpenAI(api_key=api_key or os.getenv("OPENAI_API_KEY"))
    
    def is_silence_text(self, text: str) -> bool:
        """
        Whisper가 빈 음성일 때 생성하는 헛소리(hallucination)를 걸러내는 필터
        """
        if not text:
            return True
        
        # 1) 너무 짧으면 무음 처리
        if len(text) == 0:
            return True
        
        # 2) 한국어 비율 체크
        korean_chars = [c for c in text if '가' <= c <= '힣']
        if len(korean_chars) / max(len(text), 1) < 0.3:
            return True
        
        # 3) 헛소리 패턴 필터링
        hallucination_phrases = [
            "이덕영입니다",
            "mbc 뉴스",
            "뉴스입니다",
            "지금까지 통합뉴스룸에서 전해드렸습니다",
            "고맙습니다",
            "끝까지 봐주셔서 감사합니다",
            "지금까지 신선한 경제였습니다",
            "시청해주셔서 감사합니다",
            "오늘도 시청해주셔서 감사합니다",
            "오늘 영상은 여기까지 입니다. 감사합니다",
            "오늘 영상은 여기까지 입니다. 다음에 또 만나요",
            "오늘 영상은 여기까지 입니다. 시청해주셔서 감사합니다",            
        ]
        
        lower_text = text.lower()
        for pattern in hallucination_phrases:
            if pattern.lower() in lower_text:
                return True
        
        return False

    async def transcribe(
        self, audio_data: bytes, filename: str = "audio.wav"
    ) -> STTResult:
        """
        오디오 데이터를 텍스트로 변환 (메인 메서드)
        
        Args:
            audio_data: 오디오 파일 바이트 데이터
            filename: 파일명 (확장자로 형식 판단)
        
        Returns:
            STTResult
        """
        # 파일 확장자 추출
        audio_format = filename.split('.')[-1] if '.' in filename else "wav"
        
        return await self.transcribe_audio_file(audio_data, audio_format)
    
    async def transcribe_audio_file(
        self, audio_file_bytes: bytes, audio_format: str = "webm"
    ) -> STTResult:
        """
        오디오 파일을 텍스트로 변환
        
        Args:
            audio_file_bytes: 오디오 파일 바이트
            audio_format: 파일 형식 (webm, mp3, wav 등)
        
        Returns:
            STTResult
        """
        try:
            # 임시 파일 저장
            with tempfile.NamedTemporaryFile(
                delete=False, suffix=f".{audio_format}"
            ) as temp_audio:
                temp_audio.write(audio_file_bytes)
                temp_audio_path = temp_audio.name
            
            logger.info(f"STT 시작: {temp_audio_path}")
            
            # Whisper API 호출
            with open(temp_audio_path, "rb") as audio_file:
                transcript = self.client.audio.transcriptions.create(
                    model="whisper-1",
                    file=audio_file,
                    language="ko"  # 한국어 명시
                )
            
            # 임시 파일 삭제
            os.remove(temp_audio_path)
            
            text = transcript.text.strip()
            logger.info(f"STT 완료: {text}")
            
            return STTResult(
                text=text,
                confidence=1.0,  # Whisper는 confidence 제공 안함
                language="ko"
            )
        
        except Exception as e:
            logger.error(f"STT 오류: {e}", exc_info=True)
            # 임시 파일 정리
            if 'temp_audio_path' in locals():
                try:
                    os.remove(temp_audio_path)
                except:
                    pass
            
            raise Exception(f"음성 인식 실패: {str(e)}")

