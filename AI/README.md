# AI Dialogue Agent Engine

SEL 교육용 대화 AI 엔진

## 아키텍처

```
┌─────────────────────────────────────────┐
│  FastAPI (API Layer)                    │
├─────────────────────────────────────────┤
│  L1: Orchestrator (Stage 관리)           │
│  L2: Agent (LLM + Tools)                │
├─────────────────────────────────────────┤
│  Tools (All GPT-based):                 │
│  - SafetyFilter (OpenAI Moderation)     │
│  - EmotionClassifier (GPT-4o-mini)      │
│  - ContextManager (Session)             │
│  - ActionCardGenerator (GPT-4o-mini)    │
└─────────────────────────────────────────┘
```


## Stage 흐름

```
S1 (감정 라벨링) → S2 (원인 탐색) → S3 (대안 제시) 
                → S4 (교훈 연결) → S5 (행동카드 생성)
```

## 설치

### 1. 가상환경 생성

```bash
python3 -m venv venv
source venv/bin/activate  # macOS/Linux
# venv\Scripts\activate  # Windows
```

### 2. 의존성 설치

```bash
pip install -r requirements.txt
```

### 3. 환경변수 설정

```bash
cp .env.example .env
# .env 파일에 OPENAI_API_KEY 설정
```

## 실행

### 개발 서버

```bash
cd app
python main.py
```

또는

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 프로덕션

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

## API 엔드포인트

### 1. 세션 시작

```bash
POST /api/v1/dialogue/session/start
Content-Type: multipart/form-data

story_name: "콩쥐팥쥐"
child_name: "지민"
child_age: 7
```

**Response:**

```json
{
  "success": true,
  "session_id": "uuid",
  "character_name": "콩쥐",
  "ai_intro": "지민 아, 새어머니가 나한테...",
  "stage": "S1"
}
```

### 2. 대화 턴 처리 (메인 API)

```bash
POST /api/v1/dialogue/turn
Content-Type: multipart/form-data

session_id: "uuid"
turn_number: 1
stage: "S1"
story_name: "콩쥐팥쥐"
story_theme: "감정인식"
child_name: "지민"
child_age: 7
audio_file: (binary)
```

**Response:**

```json
{
  "success": true,
  "session_id": "uuid",
  "turn_number": 1,
  "stage": "S1",
  "result": {
    "stt_result": {
      "text": "선생님이 저한테 화났어요",
      "confidence": 0.92
    },
    "safety_check": {
      "is_safe": true,
      "flagged_categories": []
    },
    "emotion_detected": {
      "primary": "분노",
      "secondary": ["슬픔"],
      "confidence": 0.85
    },
    "ai_response": {
      "text": "선생님이 화나셔서 속상했구나. 어떤 기분이 들었어?",
      "tts_url": null
    },
    "action_items": {
      "type": "emotion_selection",
      "options": ["화남", "속상함", "무서움"]
    }
  },
  "next_stage": "S1",
  "fallback_triggered": false,
  "retry_count": 0,
  "processing_time_ms": 2847
}
```

### 3. 동화 목록 조회

```bash
GET /api/v1/dialogue/stories
```

### 4. 세션 조회

```bash
GET /api/v1/dialogue/session/{session_id}
```

## 테스트

### 개별 Tool 테스트

```bash
# 안전 필터
python -m app.tools.safety_filter

# 감정 분류기
python -m app.tools.emotion_classifier

# 행동카드 생성
python -m app.tools.action_card
```

## 구조

```
AI/
├── app/
│   ├── main.py                 # FastAPI 앱
│   ├── api/
│   │   └── v1/
│   │       └── dialogue.py     # API 엔드포인트
│   ├── core/
│   │   ├── orchestrator.py     # L1: Stage 관리
│   │   └── agent.py            # L2: Agent
│   ├── tools/
│   │   ├── safety_filter.py
│   │   ├── emotion_classifier.py
│   │   ├── context_manager.py
│   │   └── action_card.py
│   ├── models/
│   │   └── schemas.py          # Pydantic 스키마
│   └── services/
│       └── stt_service.py      # Whisper API
├── requirements.txt
├── .env.example
└── README.md
```

## PR #44 개선사항

기존 코드 대비 개선된 부분:

### 1. 아키텍처
- ✅ 명확한 L1(Orchestrator) / L2(Agent) 분리
- ✅ Stage별 상태 관리
- ✅ Tool 모듈화

### 2. 세션 관리
- ✅ session_id 기반 세션 추적
- ✅ 대화 컨텍스트 누적
- ✅ Stage 전환 로직

### 3. 에러 핸들링
- ✅ 안전 필터 (Moderation API)
- ✅ STT 실패 처리
- ✅ Fallback 전략

### 4. 입력 검증
- ✅ Pydantic 스키마 검증
- ✅ 파일 형식 확인
- ✅ 필수 파라미터 체크

### 5. 확장성
- ✅ Tool 추가 용이
- ✅ Stage 추가 가능
- ✅ 프롬프트 외부화 (향후)

## 다음 단계

- [ ] 데이터베이스 연동 (PostgreSQL)
- [ ] Redis 캐싱
- [ ] TTS 통합 (Azure)
- [ ] 로깅/모니터링 (Sentry, LangSmith)
- [ ] Docker 컨테이너화
- [ ] 단위 테스트 작성

