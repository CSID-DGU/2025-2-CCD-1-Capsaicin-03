# 🚀 빠른 시작 가이드

## 1. 환경 설정

```bash
# AI 디렉토리로 이동
cd /Users/uj/Dev/2025-2-CCD-1-Capsaicin-03/AI

# .env 파일에 OpenAI API 키 설정
# .env 파일 열어서 OPENAI_API_KEY 수정
```

## 2. Redis 확인

```bash
# Redis 상태 확인
brew services list | grep redis

# Redis 시작 (이미 실행 중이면 skip)
brew services start redis

# Redis 연결 테스트
redis-cli ping
# 응답: PONG
```

## 3. 서버 실행

```bash
# 가상환경 활성화 + 서버 실행 (한 번에)
cd /Users/uj/Dev/2025-2-CCD-1-Capsaicin-03/AI
source venv/bin/activate
cd app
python main.py
```

서버가 시작되면:
```
============================================================
AI Dialogue Agent Engine 시작
============================================================
Redis 연결 확인 중...
✅ Redis 연결 성공
✅ 감정 분류기 초기화 완료
✅ 컨텍스트 매니저 초기화 완료
🚀 서버 준비 완료
INFO:     Uvicorn running on http://0.0.0.0:8000
```

## 4. 테스트

**새 터미널 열기**

```bash
# 테스트 스크립트 실행
cd /Users/uj/Dev/2025-2-CCD-1-Capsaicin-03/AI
./test_request.sh
```

## 5. 수동 테스트

### 헬스 체크
```bash
curl http://localhost:8000/health
```

### 동화 목록
```bash
curl http://localhost:8000/api/v1/dialogue/stories | python3 -m json.tool
```

### 세션 시작
```bash
curl -X POST http://localhost:8000/api/v1/dialogue/session/start \
  -F "story_name=콩쥐팥쥐" \
  -F "child_name=지민" \
  -F "child_age=7"
```

### Redis 확인
```bash
# Redis CLI 접속
redis-cli

# 모든 세션 조회
KEYS session:*

# 종료
exit
```

## 6. 문제 해결

### Redis 연결 실패
```bash
# Redis 재시작
brew services restart redis

# Redis 로그 확인
tail -f /opt/homebrew/var/log/redis.log
```

### Python 버전 오류
```bash
# Python 3.11 확인
python3.11 --version

# 가상환경 재생성
rm -rf venv
python3.11 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 의존성 오류
```bash
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

## 7. 개발 모드

### 자동 리로드 (코드 수정 시 자동 재시작)
```bash
cd app
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 로그 레벨 변경
```bash
# .env 파일에서
LOG_LEVEL=DEBUG  # 또는 INFO, WARNING, ERROR
```

## 8. 중지

```bash
# 서버 중지: Ctrl + C

# Redis 중지
brew services stop redis
```

## 다음 단계

1. **.env에 실제 OpenAI API 키 입력**
2. `python app/main.py` 실행
3. `./test_request.sh`로 테스트
4. BE (Spring Boot) 연동 시작

