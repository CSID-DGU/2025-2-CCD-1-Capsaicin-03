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
                username=settings.REDIS_USERNAME,
                password=settings.REDIS_PASSWORD,
                decode_responses=True,  # 자동으로 bytes → str 변환
                ssl=True,               #서버리스 Valkey는 TLS 필수
                ssl_cert_reqs=None,
                socket_connect_timeout=5,
                socket_timeout=5
            )
            
            # 연결 테스트
            self.client.ping()
            logger.info(
                f"✅ Redis 연결 성공: {settings.REDIS_HOST}:{settings.REDIS_PORT}"
            )
            self._connected = True
        
        except (redis.ConnectionError, redis.TimeoutError, Exception) as e:
            logger.error(f"❌ Redis 연결 실패: {e}")
            logger.warning("Redis 연결 실패로 인해 세션 조회 기능이 제한될 수 있습니다.")
            self._connected = False
            # 연결 실패해도 객체는 생성 (나중에 재시도 가능)
            self.client = None
    
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
        if not self._connected or not self.client:
            logger.error("Redis에 연결되지 않았습니다.")
            return False
        
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
        if not self._connected or not self.client:
            logger.error("Redis에 연결되지 않았습니다. 연결을 확인하세요.")
            raise ConnectionError(
                f"Redis 연결 실패: {settings.REDIS_HOST}:{settings.REDIS_PORT}. "
                "Redis 서버가 실행 중인지 확인하세요."
            )
        
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
        if not self._connected or not self.client:
            logger.error("Redis에 연결되지 않았습니다.")
            return False
        
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
        if not self._connected or not self.client:
            logger.error("Redis에 연결되지 않았습니다.")
            return False
        
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
        if not self._connected or not self.client:
            logger.error("Redis에 연결되지 않았습니다.")
            return False
        
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
        if not self._connected or not self.client:
            logger.error("Redis에 연결되지 않았습니다.")
            return None
        
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
        if not self._connected or not self.client:
            logger.error("Redis에 연결되지 않았습니다.")
            raise ConnectionError(
                f"Redis 연결 실패: {settings.REDIS_HOST}:{settings.REDIS_PORT}. "
                "Redis 서버가 실행 중인지 확인하세요."
            )
        
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
        
        except ConnectionError:
            raise
        except Exception as e:
            logger.error(f"세션 목록 조회 실패: {e}")
            return []
    
    def count_sessions(self) -> int:
        """
        현재 세션 개수
        
        Returns:
            세션 개수
        """
        if not self._connected or not self.client:
            logger.error("Redis에 연결되지 않았습니다.")
            return 0
        
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
        if not self._connected or not self.client:
            return False
        try:
            return self.client.ping()
        except:
            return False
    
    def is_connected(self) -> bool:
        """
        Redis 연결 상태 확인
        
        Returns:
            연결 여부
        """
        return self._connected
    
    def get_conversation_history(self, session_id: str) -> list:
        """
        이전 대화 내용 조회 (key_moments)
        
        Args:
            session_id: 세션 ID
        
        Returns:
            대화 히스토리 리스트 [{"stage": "S1", "turn": 1, "content": "..."}, ...]
        """
        if not self._connected or not self.client:
            logger.error("Redis에 연결되지 않았습니다.")
            raise ConnectionError(
                f"Redis 연결 실패: {settings.REDIS_HOST}:{settings.REDIS_PORT}. "
                "Redis 서버가 실행 중인지 확인하세요."
            )
        
        try:
            session_data = self.get_session(session_id)
            if not session_data:
                logger.warning(f"세션 없음: {session_id}")
                return []
            
            key_moments = session_data.get("key_moments", [])
            logger.debug(f"대화 히스토리 조회: {session_id}, {len(key_moments)}개 턴")
            return key_moments
        
        except ConnectionError:
            raise
        except Exception as e:
            logger.error(f"대화 히스토리 조회 실패: {session_id}, {e}")
            return []
    
    def get_emotion_history(self, session_id: str) -> list:
        """
        감정 히스토리 조회
        
        Args:
            session_id: 세션 ID
        
        Returns:
            감정 라벨 리스트 ["행복", "슬픔", ...]
        """
        if not self._connected or not self.client:
            logger.error("Redis에 연결되지 않았습니다.")
            raise ConnectionError(
                f"Redis 연결 실패: {settings.REDIS_HOST}:{settings.REDIS_PORT}. "
                "Redis 서버가 실행 중인지 확인하세요."
            )
        
        try:
            session_data = self.get_session(session_id)
            if not session_data:
                logger.warning(f"세션 없음: {session_id}")
                return []
            
            emotion_history = session_data.get("emotion_history", [])
            # EmotionLabel enum의 경우 값만 추출
            emotions = [
                e if isinstance(e, str) else e.get("value", str(e))
                for e in emotion_history
            ]
            logger.debug(f"감정 히스토리 조회: {session_id}, {len(emotions)}개")
            return emotions
        
        except ConnectionError:
            raise
        except Exception as e:
            logger.error(f"감정 히스토리 조회 실패: {session_id}, {e}")
            return []
    
    def get_full_conversation(self, session_id: str) -> dict:
        """
        전체 대화 정보 조회 (대화 내용 + 감정 + 세션 정보)
        
        Args:
            session_id: 세션 ID
        
        Returns:
            {
                "session_id": str,
                "child_name": str,
                "story_name": str,
                "current_stage": str,
                "current_turn": int,
                "conversation_history": [...],
                "emotion_history": [...],
                "created_at": str,
                "updated_at": str
            }
        """
        if not self._connected or not self.client:
            logger.error("Redis에 연결되지 않았습니다.")
            raise ConnectionError(
                f"Redis 연결 실패: {settings.REDIS_HOST}:{settings.REDIS_PORT}. "
                "Redis 서버가 실행 중인지 확인하세요."
            )
        
        try:
            session_data = self.get_session(session_id)
            if not session_data:
                logger.warning(f"세션 없음: {session_id}")
                return {}
            
            # 대화 히스토리와 감정 히스토리 추출
            conversation_history = session_data.get("key_moments", [])
            emotion_history = self.get_emotion_history(session_id)
            
            result = {
                "session_id": session_data.get("session_id", session_id),
                "child_name": session_data.get("child_name", ""),
                "story_name": session_data.get("story_name", ""),
                "current_stage": session_data.get("current_stage", ""),
                "current_turn": session_data.get("current_turn", 0),
                "conversation_history": conversation_history,
                "emotion_history": emotion_history,
                "created_at": session_data.get("created_at", ""),
                "updated_at": session_data.get("updated_at", ""),
                "is_active": session_data.get("is_active", False)
            }
            
            logger.debug(f"전체 대화 정보 조회: {session_id}")
            return result
        
        except ConnectionError:
            raise
        except Exception as e:
            logger.error(f"전체 대화 정보 조회 실패: {session_id}, {e}")
            return {}


# 싱글톤 인스턴스
_redis_service_instance = None

def get_redis_service() -> RedisService:
    """싱글톤 Redis 서비스 반환"""
    global _redis_service_instance
    if _redis_service_instance is None:
        _redis_service_instance = RedisService()
    return _redis_service_instance

