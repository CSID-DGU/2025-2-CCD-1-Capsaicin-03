# 서버 실행 가이드

## 1. .env 파일에 OpenAI API 키 설정 필수!
```bash
# AI/.env 파일 열어서 수정
OPENAI_API_KEY=sk-proj-your-real-key-here
```

## 2. 서버 실행
```bash
cd /Users/uj/Dev/2025-2-CCD-1-Capsaicin-03/AI
source venv/bin/activate
cd app
python main.py
```

## 3. 테스트
새 터미널에서:
```bash
cd /Users/uj/Dev/2025-2-CCD-1-Capsaicin-03/AI
./test_request.sh
```

## 4. Redis 상태 확인
```bash
redis-cli ping  # 응답: PONG
redis-cli KEYS session:*  # 세션 목록
```
