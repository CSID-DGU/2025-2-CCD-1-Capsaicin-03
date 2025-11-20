# ✅ 로컬 테스트 환경 설정 완료!

## 설치 완료 항목

- ✅ Python 가상환경 (venv)
- ✅ 필수 패키지 설치 (fastapi, uvicorn, openai, redis, etc.)
- ✅ Redis 설치 및 실행
- ✅ .env 파일 생성

## 다음 단계

### 1️⃣ OpenAI API 키 설정 (필수!)

```bash
# .env 파일 열기
nano .env

# 또는
code .env

# 아래 라인 수정
OPENAI_API_KEY=""
```

### 2️⃣ 서버 실행

```bash
./RUN.sh
```

또는 수동으로:

```bash
cd /Users/uj/Dev/2025-2-CCD-1-Capsaicin-03/AI
source venv/bin/activate
export PYTHONPATH=$(pwd)
python app/main.py
```

### 3️⃣ 테스트 (새 터미널)

```bash
# 헬스 체크
curl http://localhost:8000/health

# 동화 목록
curl http://localhost:8000/api/v1/dialogue/stories

# 세션 시작
curl -X POST http://localhost:8000/api/v1/dialogue/session/start \
  -F "story_name=콩쥐팥쥐" \
  -F "child_name=지민" \
  -F "child_age=7"
```

### 4️⃣ Redis 확인

```bash
redis-cli ping
redis-cli KEYS "session:*"
```

## 파일 구조

```
AI/
├── .env                # 환경변수 (API 키 설정!)
├── RUN.sh             # 서버 실행 스크립트
├── test_request.sh    # API 테스트 스크립트
├── venv/              # Python 가상환경
├── app/               # 애플리케이션 코드
│   ├── main.py
│   ├── core/
│   ├── tools/
│   └── api/
└── server.log         # 서버 로그
```

## 문제 해결

### Redis 연결 오류
```bash
brew services start redis
redis-cli ping
```

### 모듈 import 오류
```bash
export PYTHONPATH=/Users/uj/Dev/2025-2-CCD-1-Capsaicin-03/AI
```

### 의존성 오류
```bash
source venv/bin/activate
pip install fastapi uvicorn openai redis langchain-openai pydantic pydantic-settings python-multipart python-dotenv
```

## API 엔드포인트

- `GET /` - 기본 페이지
- `GET /health` - 헬스 체크
- `GET /api/v1/dialogue/stories` - 동화 목록
- `POST /api/v1/dialogue/session/start` - 세션 시작
- `POST /api/v1/dialogue/turn` - 대화 턴 처리
- `GET /api/v1/dialogue/session/{id}` - 세션 조회

## 로그 확인

```bash
tail -f server.log
```

## 서버 종료

`Ctrl+C` (터미널에서)

또는

```bash
ps aux | grep "python app/main.py" | grep -v grep | awk '{print $2}' | xargs kill
```

---

**모든 설정 완료! 🎉**

이제 `.env`에 실제 OpenAI API 키만 넣으면 테스트 가능합니다!

