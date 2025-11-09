"""
Redis Service
세션 데이터 저장/조회를 위한 Redis 클라이언트
"""
import redis
from typing import Optional
import json
import logging

from app.core.config import settings

logger = logging.getLogger(__name__)


class RedisService:
    """Redis 세션 관리 서비스"""
    
    def __init__(self):
        """Redis 클라이언트 초기화"""
        try:
            self.client = redis.Redis(
                host=settings.REDIS_HOST,
                port=settings.REDIS_PORT,
                db=settings.REDIS_DB,
                password=settings.REDIS_PASSWORD,
                decode_responses=True,  # 자동으로 bytes → str 변환
                socket_connect_timeout=5,
                socket_timeout=5
            )
            
            # 연결 테스트
            self.client.ping()
            logger.info(
                f"✅ Redis 연결 성공: {settings.REDIS_HOST}:{settings.REDIS_PORT}"
            )
        
        except redis.ConnectionError as e:
            logger.error(f"❌ Redis 연결 실패: {e}")
            raise
    
    def save_session(self, session_id: str, session_data: dict, ttl: int = None) -> bool:
        """
        세션 저장
        
        Args:
            session_id: 세션 ID
            session_data: 세션 데이터 (dict)
            ttl: 만료 시간 (초), 기본값은 settings.SESSION_TTL
        
        Returns:
            성공 여부
        """
        try:
            key = self._make_key(session_id)
            value = json.dumps(session_data, ensure_ascii=False, default=str)
            
            # TTL과 함께 저장
            ttl = ttl or settings.SESSION_TTL
            self.client.setex(key, ttl, value)
            
            logger.debug(f"세션 저장: {session_id} (TTL: {ttl}초)")
            return True
        
        except Exception as e:
            logger.error(f"세션 저장 실패: {session_id}, {e}")
            return False
    
    def get_session(self, session_id: str) -> Optional[dict]:
        """
        세션 조회
        
        Args:
            session_id: 세션 ID
        
        Returns:
            세션 데이터 (dict) 또는 None
        """
        try:
            key = self._make_key(session_id)
            value = self.client.get(key)
            
            if value is None:
                logger.debug(f"세션 없음: {session_id}")
                return None
            
            session_data = json.loads(value)
            logger.debug(f"세션 조회: {session_id}")
            return session_data
        
        except Exception as e:
            logger.error(f"세션 조회 실패: {session_id}, {e}")
            return None
    
    def delete_session(self, session_id: str) -> bool:
        """
        세션 삭제
        
        Args:
            session_id: 세션 ID
        
        Returns:
            성공 여부
        """
        try:
            key = self._make_key(session_id)
            result = self.client.delete(key)
            
            logger.debug(f"세션 삭제: {session_id}, deleted={result}")
            return result > 0
        
        except Exception as e:
            logger.error(f"세션 삭제 실패: {session_id}, {e}")
            return False
    
    def session_exists(self, session_id: str) -> bool:
        """
        세션 존재 여부 확인
        
        Args:
            session_id: 세션 ID
        
        Returns:
            존재 여부
        """
        try:
            key = self._make_key(session_id)
            return self.client.exists(key) > 0
        
        except Exception as e:
            logger.error(f"세션 존재 확인 실패: {session_id}, {e}")
            return False
    
    def extend_session_ttl(self, session_id: str, ttl: int = None) -> bool:
        """
        세션 만료 시간 연장
        
        Args:
            session_id: 세션 ID
            ttl: 새로운 만료 시간 (초)
        
        Returns:
            성공 여부
        """
        try:
            key = self._make_key(session_id)
            ttl = ttl or settings.SESSION_TTL
            
            result = self.client.expire(key, ttl)
            logger.debug(f"세션 TTL 연장: {session_id}, TTL={ttl}초")
            return result
        
        except Exception as e:
            logger.error(f"세션 TTL 연장 실패: {session_id}, {e}")
            return False
    
    def get_session_ttl(self, session_id: str) -> Optional[int]:
        """
        세션 남은 시간 조회
        
        Args:
            session_id: 세션 ID
        
        Returns:
            남은 시간 (초) 또는 None
        """
        try:
            key = self._make_key(session_id)
            ttl = self.client.ttl(key)
            
            # -2: 키 없음, -1: 만료 없음
            if ttl < 0:
                return None
            
            return ttl
        
        except Exception as e:
            logger.error(f"세션 TTL 조회 실패: {session_id}, {e}")
            return None
    
    def get_all_session_ids(self) -> list:
        """
        모든 세션 ID 목록 조회
        
        Returns:
            세션 ID 리스트
        """
        try:
            pattern = self._make_key("*")
            keys = self.client.keys(pattern)
            
            # Prefix 제거
            session_ids = [
                key.replace(settings.SESSION_PREFIX, "") 
                for key in keys
            ]
            
            logger.debug(f"전체 세션 수: {len(session_ids)}")
            return session_ids
        
        except Exception as e:
            logger.error(f"세션 목록 조회 실패: {e}")
            return []
    
    def count_sessions(self) -> int:
        """
        현재 세션 개수
        
        Returns:
            세션 개수
        """
        try:
            pattern = self._make_key("*")
            return len(self.client.keys(pattern))
        
        except Exception as e:
            logger.error(f"세션 개수 조회 실패: {e}")
            return 0
    
    def _make_key(self, session_id: str) -> str:
        """
        Redis 키 생성
        
        Args:
            session_id: 세션 ID
        
        Returns:
            Redis 키 (예: "session:uuid-1234")
        """
        return f"{settings.SESSION_PREFIX}{session_id}"
    
    def ping(self) -> bool:
        """
        Redis 연결 상태 확인
        
        Returns:
            연결 여부
        """
        try:
            return self.client.ping()
        except:
            return False


# 싱글톤 인스턴스
_redis_service_instance = None

def get_redis_service() -> RedisService:
    """싱글톤 Redis 서비스 반환"""
    global _redis_service_instance
    if _redis_service_instance is None:
        _redis_service_instance = RedisService()
    return _redis_service_instance

