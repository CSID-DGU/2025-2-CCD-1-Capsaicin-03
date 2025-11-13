# Redis 연결 가이드

## 1. Redis 설치

### Windows에서 Redis 설치

#### 방법 1: WSL2 사용 (권장)
```bash
# WSL2에서 Redis 설치
sudo apt-get update
sudo apt-get install redis-server

# Redis 시작
sudo service redis-server start

# Redis 상태 확인
sudo service redis-server status
```

#### 방법 2: Docker 사용
```bash
# Redis Docker 컨테이너 실행
docker run -d -p 6379:6379 --name redis redis

# 컨테이너 상태 확인
docker ps

# Redis 컨테이너 중지
docker stop redis

# Redis 컨테이너 시작
docker start redis
```

#### 방법 3: Windows용 Redis (Memurai)
- [Memurai](https://www.memurai.com/) 다운로드 및 설치
- Windows 서비스로 자동 실행

### Linux/Mac에서 Redis 설치
```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install redis-server

# Mac (Homebrew)
brew install redis
brew services start redis

# Redis 시작
redis-server
```

## 2. 환경 변수 설정

### .env 파일 생성
프로젝트 루트에 `.env` 파일을 생성하고 다음 내용을 추가하세요:

```env
# Redis 설정
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0
REDIS_PASSWORD=

# 또는 Redis URL로 직접 지정
# REDIS_URL=redis://localhost:6379/0
```

### 환경 변수 설명
- `REDIS_HOST`: Redis 서버 호스트 (기본값: localhost)
- `REDIS_PORT`: Redis 서버 포트 (기본값: 6379)
- `REDIS_DB`: Redis 데이터베이스 번호 (기본값: 0)
- `REDIS_PASSWORD`: Redis 비밀번호 (없으면 빈 문자열)
- `REDIS_URL`: Redis 연결 URL (선택사항, 위 설정보다 우선)

## 3. Redis 연결 테스트

### Python 스크립트로 테스트
```bash
# 프로젝트 루트에서 실행
python app/test_redis_connection.py
```

### Python 코드로 테스트
```python
from app.services.redis_service import get_redis_service

# Redis 서비스 인스턴스 가져오기
redis_service = get_redis_service()

# 연결 상태 확인
if redis_service.is_connected():
    print("✅ Redis 연결 성공!")
    
    # Ping 테스트
    if redis_service.ping():
        print("✅ Ping 테스트 성공")
    
    # 세션 개수 확인
    count = redis_service.count_sessions()
    print(f"저장된 세션 수: {count}")
else:
    print("❌ Redis 연결 실패")
```

## 4. Redis CLI로 테스트

### Redis CLI 접속
```bash
# 로컬 Redis 연결
redis-cli

# 원격 Redis 연결
redis-cli -h localhost -p 6379

# 비밀번호가 있는 경우
redis-cli -h localhost -p 6379 -a password
```

### 기본 명령어
```bash
# Ping 테스트
PING
# 응답: PONG

# 키 목록 조회
KEYS *

# 세션 키 조회
KEYS session:*

# 특정 키 값 조회
GET session:your-session-id

# 키 삭제
DEL session:your-session-id

# 모든 키 삭제 (주의!)
FLUSHALL
```

## 5. 문제 해결

### 연결 실패 시 확인 사항

1. **Redis 서버 실행 확인**
   ```bash
   # Linux/Mac
   ps aux | grep redis
   sudo service redis-server status
   
   # Docker
   docker ps | grep redis
   ```

2. **포트 확인**
   ```bash
   # Windows
   netstat -an | findstr 6379
   
   # Linux/Mac
   netstat -an | grep 6379
   # 또는
   lsof -i :6379
   ```

3. **방화벽 확인**
   - Windows: 방화벽에서 6379 포트 허용
   - Linux: `sudo ufw allow 6379`

4. **설정 파일 확인**
   - `.env` 파일이 프로젝트 루트에 있는지 확인
   - 환경 변수 값이 올바른지 확인

5. **Redis 로그 확인**
   ```bash
   # Redis 로그 파일 위치
   # Linux: /var/log/redis/redis-server.log
   # Mac: /usr/local/var/log/redis.log
   ```

### 일반적인 오류

#### Connection refused
- Redis 서버가 실행 중이 아닙니다
- 해결: Redis 서버를 시작하세요

#### Timeout
- Redis 서버에 접근할 수 없습니다
- 해결: 호스트와 포트를 확인하세요

#### Authentication required
- Redis 비밀번호가 설정되어 있습니다
- 해결: `.env` 파일에 `REDIS_PASSWORD`를 설정하세요

## 6. 프로덕션 환경

### Redis 비밀번호 설정
```bash
# redis.conf 파일 수정
requirepass your-strong-password

# .env 파일에 비밀번호 추가
REDIS_PASSWORD=your-strong-password
```

### Redis 영구 저장 설정
```bash
# redis.conf 파일 수정
save 900 1
save 300 10
save 60 10000
```

### Redis 모니터링
```bash
# Redis 모니터링 모드
redis-cli MONITOR

# Redis 정보 조회
redis-cli INFO
```

## 7. 추가 리소스

- [Redis 공식 문서](https://redis.io/documentation)
- [Redis Python 클라이언트](https://redis-py.readthedocs.io/)
- [Redis 명령어 참조](https://redis.io/commands)



