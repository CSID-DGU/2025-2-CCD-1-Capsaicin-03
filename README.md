# 🌱 나무록무록 (Namurokmurok)

> **SEL(Social Emotional Learning) 교육을 위한 AI 음성 대화 플랫폼**  
> 동화 속 캐릭터와의 대화를 통해 아동의 감정 인식 및 표현 능력을 향상시키는 교육용 서비스

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Python](https://img.shields.io/badge/python-3.9+-blue.svg)](https://www.python.org/)
[![React](https://img.shields.io/badge/react-19.1+-61DAFB.svg)](https://reactjs.org/)
[![Spring Boot](https://img.shields.io/badge/spring--boot-3.5.6-6DB33F.svg)](https://spring.io/projects/spring-boot)

---

## 📌 프로젝트 소개

**나무록무록**은 동화 기반 SEL 교육을 제공하는 AI 음성 대화 플랫폼입니다.  
아동이 동화 속 캐릭터와 자연스러운 음성 대화를 나누며 감정을 이해하고 표현하는 방법을 학습합니다.

### 주요 기능
- 🎤 **실시간 음성 대화**: STT/TTS를 통한 자연스러운 음성 상호작용
- 🤖 **AI 대화 엔진**: GPT-4 기반의 맞춤형 대화 생성 및 감정 분석
- 📚 **동화 기반 학습**: 친숙한 동화 캐릭터를 통한 몰입형 학습 경험
- 🎯 **6단계 대화 시나리오**: 체계적인 감정 학습 프로세스
- 🛡️ **안전 필터**: 부적절한 표현 감지 및 교육적 대응
- 📊 **학습 피드백**: 부모님을 위한 상세한 대화 분석 및 피드백

---

## 🏗️ 시스템 아키텍처

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Frontend   │────▶│   Backend   │────▶│  AI Engine  │
│   (React)   │     │ (Spring)    │     │  (FastAPI)  │
└─────────────┘     └─────────────┘     └─────────────┘
       │                    │                    │
       │                    │                    │
       ▼                    ▼                    ▼
  Supabase            PostgreSQL           OpenAI API
   (Auth)              (MySQL)             Redis Cache
```

### 기술 스택

#### Frontend
- **Framework**: React 19.1 + Vite
- **Routing**: React Router v7
- **Auth**: Supabase
- **HTTP Client**: Axios
- **Analytics**: Google Analytics 4

#### Backend
- **Framework**: Spring Boot 3.5.6
- **Language**: Java 17
- **Database**: MySQL (JPA/Hibernate)
- **API**: RESTful API

#### AI Engine
- **Framework**: FastAPI
- **LLM**: OpenAI GPT-4o-mini
- **STT**: OpenAI Whisper
- **TTS**: Supertone (한국어 음성 합성)
- **Cache**: Redis
- **Safety**: OpenAI Moderation API

---

## 📂 프로젝트 구조

```
2025-2-CCD-1-Capsaicin-03/
├── Frontend/              # React 웹 애플리케이션
│   ├── src/
│   │   ├── components/   # UI 컴포넌트
│   │   ├── api/          # API 통신 모듈
│   │   └── assets/       # 정적 리소스
│   └── package.json
│
├── Backend/              # Spring Boot API 서버
│   ├── src/
│   │   ├── main/
│   │   │   └── java/     # Java 소스 코드
│   │   └── test/
│   └── build.gradle
│
└── AI/                   # FastAPI AI 대화 엔진
    ├── app/
    │   ├── api/          # API 라우터
    │   ├── core/         # Agent & Orchestrator
    │   ├── models/       # 데이터 모델
    │   ├── services/     # STT/TTS 서비스
    │   ├── tools/        # AI 도구들
    │   └── utils/        # 유틸리티
    ├── requirements.txt
    └── docker-compose.yml
```

---

## 🚀 빠른 시작

### 사전 요구사항
- Python 3.9+
- Node.js 18+
- Java 17+
- MySQL 8.0+
- Redis (선택)

### 1. AI Engine 실행

```bash
cd AI
pip install -r requirements.txt

# 환경 변수 설정
export OPENAI_API_KEY="your-api-key"
export SUPERTONE_API_KEY="your-supertone-key"
export REDIS_URL="redis://localhost:6379"

# 서버 실행
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 2. Backend 실행

```bash
cd Backend
./gradlew bootRun
```

서버: `http://localhost:8080`

### 3. Frontend 실행

```bash
cd Frontend
npm install
npm run dev
```

개발 서버: `http://localhost:5173`

---

## 🎯 AI 대화 흐름 (6 Stages)

```
┌─────────────────────────────────────────────────────┐
│  S1: 감정 라벨링 (Emotion Labeling)                   │
│  → 동화 속 캐릭터의 감정을 인식하고 표현              │
├─────────────────────────────────────────────────────┤
│  S2: 감정 원인 탐색 (Ask Reason - Emotion 1)        │
│  → 캐릭터가 왜 그런 감정을 느꼈는지 분석             │
├─────────────────────────────────────────────────────┤
│  S3: 경험 공유 (Ask Experience)                      │
│  → 아동 자신의 유사한 경험 이야기하기                │
├─────────────────────────────────────────────────────┤
│  S4: 현실 세계 연결 (Real World Emotion)            │
│  → 실제 생활에서 비슷한 상황 찾기                    │
├─────────────────────────────────────────────────────┤
│  S5: 감정 원인 심화 (Ask Reason - Emotion 2)        │
│  → 자신의 감정 원인 깊이 탐구                        │
├─────────────────────────────────────────────────────┤
│  S6: 행동 카드 생성 (Action Card)                    │
│  → 감정 조절을 위한 구체적 행동 방안 제시            │
└─────────────────────────────────────────────────────┘
```

---

## 🔧 주요 기능 상세

### 1. 음성 대화 시스템
- **STT (Speech-to-Text)**: OpenAI Whisper API
  - 무음 감지 및 hallucination 필터링
  - 잘못된 출력 제거
  
- **TTS (Text-to-Speech)**: Supertone API
  - 자연스러운 한국어 음성 합성
  - 캐릭터별 맞춤 목소리

### 2. 안전 필터
- **2단계 필터링**:
  1. 한국어 금칙어 리스트 기반 필터 (korean_badwords.txt)
  2. OpenAI Moderation API (폭력, 자해, 혐오 표현 등)
  
- **교육적 대응**: 부적절한 표현 사용 시 교육적 피드백 제공

### 3. 감정 분석
- GPT-4o-mini 기반 실시간 감정 분류
- 8가지 감정 라벨: 행복, 슬픔, 화남, 두려움, 놀람, 혐오, 중립, 기타

### 4. 맥락 관리
- Redis 기반 대화 히스토리 캐싱
- Session별 상태 관리 및 Stage 전환

### 5. 피드백 생성
- 부모님을 위한 상세 학습 리포트
- S1 감정 비교 (정답 vs 아동 응답)
- 부적절한 표현 사용 내역 포함

---

## 📊 API 엔드포인트

### AI Engine (FastAPI)
```
POST   /api/v1/dialogue/init                    # 대화 초기화
POST   /api/v1/dialogue/stage/{stage_name}      # Stage별 대화 실행
POST   /api/v1/dialogue/session/{session_id}/feedback  # 피드백 생성
GET    /api/v1/dialogue/session/{session_id}    # 세션 조회
```

### Backend (Spring Boot)
```
POST   /api/auth/login              # 로그인
POST   /api/stories                 # 동화 생성
GET    /api/stories/{id}            # 동화 조회
POST   /api/sessions                # 세션 생성
GET    /api/sessions/{id}/feedback  # 피드백 조회
```

---

## 🛠️ 개발 가이드

### 환경 변수 설정

#### AI Engine (.env)
```env
OPENAI_API_KEY=sk-...
SUPERTONE_API_KEY=...
REDIS_URL=redis://localhost:6379
```

#### Backend (application.yml)
```yaml
spring:
  datasource:
    url: jdbc:mysql://localhost:3306/namurokmurok
    username: root
    password: your-password
```

#### Frontend (.env)
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_URL=http://localhost:8080
VITE_AI_API_URL=http://localhost:8000
```

---

## 📖 문서

자세한 문서는 각 디렉토리의 README를 참조하세요:
- [AI Engine 상세 가이드](./AI/README.md)
- [AI 아키텍처 결정 사항](./AI/ARCHITECTURE_DECISIONS.md)
- [AI 빠른 시작](./AI/QUICKSTART.md)
- [Backend 가이드](./Backend/README.md)
- [Frontend 가이드](./Frontend/README.md)

---

## 👥 팀원

**Capsaicin Team**
- 김서연: Frontend 개발
- 김현정: AI Engine 개발
- 유정인: 기획, PM, 디자인
- 장주리: Backend 개발

---

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다. 자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요.

---

## 🙏 감사의 말

- OpenAI (GPT-4, Whisper API)
- Supertone (한국어 TTS)
- Supabase (인증 시스템)
- 동국대학교 캡스톤 디자인

---

**Made with ❤️ by Capsaicin Team**
