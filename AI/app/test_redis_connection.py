"""
Redis 연결 테스트 스크립트
"""
import sys
import os

# Windows 콘솔 인코딩 설정
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

# 현재 디렉토리를 Python 경로에 추가
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.redis_service import get_redis_service
from app.core.config import settings


def test_redis_connection():
    """Redis 연결 테스트"""
    print("=" * 60)
    print("Redis 연결 테스트")
    print("=" * 60)
    print(f"Redis 호스트: {settings.REDIS_HOST}")
    print(f"Redis 포트: {settings.REDIS_PORT}")
    print(f"Redis DB: {settings.REDIS_DB}")
    print(f"Redis 비밀번호: {'설정됨' if settings.REDIS_PASSWORD else '없음'}")
    print()
    
    try:
        # Redis 서비스 인스턴스 가져오기
        redis_service = get_redis_service()
        
        # 연결 상태 확인
        if redis_service.is_connected():
            print("[SUCCESS] Redis 연결 성공!")
            print()
            
            # Ping 테스트
            if redis_service.ping():
                print("[SUCCESS] Ping 테스트 성공")
            else:
                print("[ERROR] Ping 테스트 실패")
            
            # 세션 개수 확인
            session_count = redis_service.count_sessions()
            print(f"[INFO] 현재 저장된 세션 수: {session_count}")
            
            # 모든 세션 ID 조회
            if session_count > 0:
                session_ids = redis_service.get_all_session_ids()
                print(f"\n세션 ID 목록 (최대 10개):")
                for i, sid in enumerate(session_ids[:10], 1):
                    print(f"  [{i}] {sid}")
            
            # 테스트 세션 저장/조회
            print("\n" + "=" * 60)
            print("테스트 세션 저장/조회")
            print("=" * 60)
            test_session_id = "test-connection-123"
            test_data = {
                "session_id": test_session_id,
                "child_name": "테스트",
                "story_name": "콩쥐팥쥐",
                "key_moments": [{"stage": "S1", "turn": 1, "content": "테스트 대화"}],
                "emotion_history": ["행복"]
            }
            
            # 저장
            if redis_service.save_session(test_session_id, test_data, ttl=60):
                print("[SUCCESS] 테스트 세션 저장 성공")
            else:
                print("[ERROR] 테스트 세션 저장 실패")
                return
            
            # 조회
            retrieved = redis_service.get_session(test_session_id)
            if retrieved:
                print("[SUCCESS] 테스트 세션 조회 성공")
                print(f"   - 아동 이름: {retrieved.get('child_name')}")
                print(f"   - 동화 제목: {retrieved.get('story_name')}")
            else:
                print("[ERROR] 테스트 세션 조회 실패")
            
            # 대화 히스토리 조회
            history = redis_service.get_conversation_history(test_session_id)
            print(f"[SUCCESS] 대화 히스토리 조회: {len(history)}개")
            
            # 감정 히스토리 조회
            emotions = redis_service.get_emotion_history(test_session_id)
            print(f"[SUCCESS] 감정 히스토리 조회: {emotions}")
            
            # 테스트 세션 삭제
            if redis_service.delete_session(test_session_id):
                print("[SUCCESS] 테스트 세션 삭제 성공")
            
            print("\n" + "=" * 60)
            print("[SUCCESS] 모든 테스트 완료!")
            print("=" * 60)
            
        else:
            print("[ERROR] Redis 연결 실패")
            print("\n해결 방법:")
            print("1. Redis 서버가 실행 중인지 확인하세요")
            print("2. Redis 설치: https://redis.io/download")
            print("3. Windows에서 Redis 설치:")
            print("   - WSL2 사용: sudo apt-get install redis-server")
            print("   - 또는 Docker 사용: docker run -d -p 6379:6379 redis")
            print("4. .env 파일에서 REDIS_HOST, REDIS_PORT 설정 확인")
            
    except Exception as e:
        print(f"[ERROR] 오류 발생: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    test_redis_connection()

