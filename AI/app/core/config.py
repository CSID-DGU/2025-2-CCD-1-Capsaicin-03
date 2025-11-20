"""
애플리케이션 설정
환경변수 로드 및 전역 설정 관리
"""
from pydantic_settings import BaseSettings
from typing import Optional
import os


class Settings(BaseSettings):
    """애플리케이션 설정"""
    
    # API 설정
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000
    DEBUG: bool = True
    
    # OpenAI API
    OPENAI_API_KEY: Optional[str] = None
    OPENAI_MODEL: str = "gpt-4o-mini"
    OPENAI_TEMPERATURE: float = 0.7
    
    # Redis 설정
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_DB: int = 0
    REDIS_USERNAME: str | None = None
    REDIS_PASSWORD: Optional[str] = None
    REDIS_URL: Optional[str] = None
    
    # 세션 설정
    SESSION_TTL: int = 3600  # 1시간 (초)
    SESSION_PREFIX: str = "session:"
    
    # Whisper 설정
    WHISPER_MODEL: str = "whisper-1"
    
    # 로그 설정
    LOG_LEVEL: str = "INFO"
    
    class Config:
        env_file = ".env"
        case_sensitive = True
    
    @property
    def redis_connection_url(self) -> str:
        """Redis 연결 URL 생성"""
        if self.REDIS_URL:
            return self.REDIS_URL
        
        password_part = f":{self.REDIS_PASSWORD}@" if self.REDIS_PASSWORD else ""
        return f"redis://{password_part}{self.REDIS_HOST}:{self.REDIS_PORT}/{self.REDIS_DB}"


# 싱글톤 설정 인스턴스
settings = Settings()

