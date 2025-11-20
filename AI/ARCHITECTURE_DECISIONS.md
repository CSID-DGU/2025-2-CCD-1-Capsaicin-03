# 아키텍처 설계 의사결정 (Architecture Decision Records)

## 목차
1. [BE를 단순 클라이언트로 분리](#1-be를-단순-클라이언트로-분리)
2. [2단계 Orchestrator 구조](#2-2단계-orchestrator-구조)
3. [Redis 기반 세션 관리](#3-redis-기반-세션-관리)
4. [Stage 기반 대화 관리](#4-stage-기반-대화-관리)
5. [GPT 기반 감정 분류](#5-gpt-기반-감정-분류)
6. [Tool 패턴 사용](#6-tool-패턴-사용)

---

## 1. BE를 단순 클라이언트로 분리

### 결정 사항
Spring Boot(BE)는 AI 로직을 포함하지 않고, FastAPI(AI BE)로 요청만 전달하는 클라이언트 역할

### 배경
```
[초기 고민]
Option A: Spring Boot에서 AI 로직 직접 구현
  - Python AI 라이브러리를 Java로 재구현
  - 단일 서버로 간단한 구조

Option B: AI 로직을 별도 Python 서버로 분리 ✅ 선택
  - BE는 요청 중계만 담당
  - AI BE는 AI 로직 전담
```

### 선택 이유
**✅ 장점:**
- **기술 스택 최적화**: Python은 AI/ML 생태계가 풍부 (Langchain, Transformers)
- **독립적 확장**: AI 서버만 스케일 아웃 가능
- **병렬 개발**: BE팀과 AI팀이 독립적으로 개발
- **쉬운 교체**: AI 모델/로직 변경 시 BE 코드 수정 불필요

**❌ 단점:**
- 네트워크 레이턴시 증가 (BE → AI BE)
- 서버 2개 관리 필요
- 배포 복잡도 증가

### 트레이드오프
| 항목 | 단일 서버 | 분리 구조 (선택) |
|------|-----------|------------------|
| 개발 속도 | 느림 (Java로 AI 구현) | 빠름 (Python 생태계 활용) |
| 운영 복잡도 | 낮음 | 중간 |
| 확장성 | 낮음 (전체 스케일링) | 높음 (AI만 스케일링) |
| 레이턴시 | 낮음 | 중간 (+50~100ms) |

### 대안 검토
1. **Java ML 라이브러리 (DL4J)**: 성능↓, 생태계↓
2. **gRPC 통신**: 고려했으나 REST로 충분 판단
3. **AI 로직을 Lambda로**: Cold start 문제로 배제

---

## 2. 2단계 Orchestrator 구조

### 결정 사항
```python
L1 (Orchestrator): Stage 순서 제어 (고정)
L2 (Agent): Tool 실행, 대화 생성 (유연)
```

### 배경
**[문제]**
- 순차적 대화 흐름 (S1→S2→S3→S4→S5) 보장 필요
- 각 Stage 내에서는 유연한 Tool 사용 필요
- 실패 시 Fallback 전략 자동 실행

**[고민한 구조]**
```
A. 단일 Agent가 모든 것 결정
   → 순서 보장 어려움, 예측 불가능

B. 완전 Rule-based
   → 유연성 없음, 하드코딩 많음

C. L1(규칙) + L2(LLM) ✅ 선택
   → 안정성 + 유연성 균형
```

### 선택 이유
**Orchestrator (L1):**
```python
# 고정된 순서 보장
def should_transition(stage, result):
    if stage == S1 and emotion_detected:
        return True  # S2로 전환
    # 명확한 규칙
```

**Agent (L2):**
```python
# LLM이 유연하게 처리
def generate_response(context):
    # 상황에 맞는 공감 표현 생성
    # Tool 실행 결과를 자연스럽게 통합
```

### 장점
- ✅ **예측 가능성**: Stage 순서는 항상 일정
- ✅ **디버깅 용이**: 어느 Stage에서 문제인지 명확
- ✅ **자연스러움**: LLM이 대화 생성
- ✅ **Fallback 전략**: Orchestrator가 재시도 관리

### 단점
- ❌ 구현 복잡도 증가
- ❌ 두 레이어 간 인터페이스 설계 필요

### 실전 예시
```python
# Orchestrator: "감정 분류 됐어? → S2로 가!"
if emotion_result.primary:
    session.current_stage = Stage.S2
    session.retry_count = 0

# Agent: "어떻게 말할까?" (LLM이 결정)
ai_response = llm.invoke("""
    아이가 "속상해요"라고 했어.
    공감하며 원인을 물어봐.
""")
```

---

## 3. Redis 기반 세션 관리

### 결정 사항
세션 데이터는 Redis에 저장 (PostgreSQL 아님)

### 배경
**[요구사항]**
- 1턴마다 세션 조회/저장 (초당 수십 번)
- 1시간 후 자동 삭제
- 빠른 응답 속도 (< 100ms)

**[대안 비교]**
| 방식 | 속도 | TTL | 확장성 |
|------|------|-----|--------|
| 메모리 | 빠름 | 수동 | 낮음 |
| Redis ✅ | 빠름 | 자동 | 높음 |
| PostgreSQL | 느림 | 수동 | 중간 |

### 선택 이유
```python
# Redis: 밀리초 응답
session = redis_service.get_session(session_id)  # 1~3ms

# vs PostgreSQL: 수십 밀리초
session = db.query(Session).filter_by(id=session_id).first()  # 20~50ms
```

**✅ 장점:**
- **빠른 속도**: In-memory (1~3ms)
- **자동 TTL**: 1시간 후 자동 삭제
- **간단한 구조**: Key-Value 저장
- **쉬운 확장**: Redis Cluster로 수평 확장

**❌ 단점:**
- **휘발성**: 서버 재시작 시 데이터 손실 (RDB/AOF로 보완 가능)
- **영구 저장 불가**: 대화 기록 분석은 별도 DB 필요

### Hybrid 전략
```python
# Redis: 진행 중인 세션 (임시)
session = redis.get("session:uuid")

# PostgreSQL: 완료된 대화 (영구)
db.save(DialogueHistory(
    session_id=uuid,
    turns=[...],
    action_card={...}
))
```

---

## 4. Stage 기반 대화 관리

### 결정 사항
5단계 Stage로 대화 흐름 구조화

```
S1: 감정 라벨링
S2: 원인 탐색
S3: 대안 제시
S4: 교훈 연결
S5: 행동카드 생성
```

### 배경
**[문제]**
- 자유 대화 → 학습 목표 달성 보장 어려움
- SEL 교육 효과 측정 불가능

**[대안]**
```
A. 자유 대화 (Open-ended)
   → 재미있지만 교육 효과 불명확

B. 완전 Scripted
   → 지루함, 개인화 불가

C. Stage 기반 구조화 ✅
   → 목표 보장 + 유연성
```

### 선택 이유
**교육 목표 달성:**
```python
# 각 Stage는 명확한 학습 목표
S1: "감정 인식 능력" 학습
S2: "원인-결과 연결" 학습
S3: "대처 전략 습득"
S4: "메타인지" 강화
S5: "행동 전환" 촉진
```

**측정 가능성:**
```python
# Stage별 성공률 추적
metrics = {
    "S1_success_rate": 0.85,  # 85% 감정 분류 성공
    "S2_success_rate": 0.78,  # 78% 원인 파악 성공
    "avg_retry_count": 1.2    # 평균 재시도 1.2회
}
```

### 장점
- ✅ **일관된 학습**: 모든 아이가 5단계 경험
- ✅ **효과 측정**: 단계별 성공률 분석 가능
- ✅ **개선 포인트 파악**: 어느 단계가 어려운지 명확
- ✅ **부모 리포트**: "S1에서 분노 감정 학습했어요"

### 단점
- ❌ **경직성**: 자유로운 대화 제한
- ❌ **이탈 가능성**: 5단계가 지루할 수 있음

### 완화 전략
```python
# Fallback으로 유연성 확보
if retry_count >= 3:
    # 선택지 제공으로 진행 보장
    action_items = {
        "type": "emotion_selection",
        "options": ["화남", "속상함", "무서움"]
    }
```

---

## 5. GPT 기반 감정 분류

### 결정 사항
Transformers 모델 대신 GPT-4o-mini 사용

### 배경
**[초기 구현]**
```python
# KoELECTRA 모델 (3GB)
model = AutoModelForSequenceClassification.from_pretrained(
    "Jinuuuu/KoELECTRA_fine_tunning_emotion"
)
# → 로딩 시간: 10~20초
# → 메모리: 3~4GB
```

**[변경 후]**
```python
# GPT-4o-mini (API)
emotion = llm.invoke("이 발화의 감정: '속상해요'")
# → 로딩 시간: 0초
# → 메모리: 0MB
# → 비용: $0.00006/회
```

### 선택 이유
**비용 계산:**
```
시나리오: 일 1000명, 각 5턴
- 감정 분류: 5000회/일
- 비용: 5000 × $0.00006 = $0.3/일
- 월 비용: $9 (매우 저렴!)

vs 서버 비용:
- 4GB 메모리 인스턴스: $50~100/월
```

**✅ 장점:**
- **Zero 로딩 시간**: 서버 즉시 시작
- **Zero 메모리**: GPU 불필요
- **높은 정확도**: 맥락 이해 우수
- **reasoning 제공**: "왜 분노인지" 설명
- **저렴한 비용**: 월 $10 이하

**❌ 단점:**
- **API 의존성**: OpenAI 장애 시 영향
- **레이턴시**: 200~500ms (vs 50ms)
- **누적 비용**: 대규모 시 고려 필요

### Fallback 전략
```python
try:
    # GPT로 분류
    emotion = gpt_classify(text)
except:
    # 키워드 기반 Fallback
    emotion = keyword_classify(text)
```

---

## 6. Tool 패턴 사용

### 결정 사항
LangChain Tool 패턴으로 기능 모듈화

### 배경
```python
# 문제: Agent가 모든 기능을 직접 호출
def agent_process(text):
    # 안전 필터
    if check_safety(text):
        return "위험한 말"
    
    # 감정 분류
    emotion = classify_emotion(text)
    
    # 행동카드 생성
    card = generate_card(emotion)
    
    # → 코드 중복, 테스트 어려움
```

**[Tool 패턴]**
```python
# 각 기능을 Tool로 독립
@tool
def safety_filter_tool(text: str) -> Dict:
    """안전성 검사 Tool"""
    return {"is_safe": True, "message": None}

@tool
def emotion_classifier_tool(text: str) -> Dict:
    """감정 분류 Tool"""
    return {"primary": "분노", "confidence": 0.85}
```

### 선택 이유
**✅ 장점:**
- **독립적 테스트**: 각 Tool 단위 테스트 가능
- **재사용성**: 여러 Agent가 Tool 공유
- **확장 용이**: 새 Tool 추가 쉬움
- **명확한 책임**: 각 Tool의 역할 분명

```python
# 테스트 용이
def test_safety_filter():
    result = safety_filter_tool("죽고 싶어")
    assert result["is_safe"] == False

# 독립 실행 가능
if __name__ == "__main__":
    result = emotion_classifier_tool("속상해요")
    print(result)  # 디버깅
```

### Tool 목록 설계 근거
```python
1. SafetyFilter
   → 아동 보호 (최우선)
   
2. EmotionClassifier
   → S1의 핵심 기능
   
3. ContextManager
   → 세션/동화 정보 관리
   
4. ActionCardGenerator
   → S3, S5의 산출물
```

---

## 트레이드오프 요약표

| 설계 결정 | 선택 | 장점 | 단점 | 비용 |
|----------|------|------|------|------|
| BE 분리 | AI BE 독립 | 기술 최적화, 확장성 | 레이턴시 증가 | 서버 비용 +α |
| 2단계 구조 | Orchestrator+Agent | 안정성+유연성 | 복잡도 증가 | 개발 시간 +20% |
| 세션 관리 | Redis | 속도, TTL 자동 | 휘발성 | 월 $10 |
| Stage 구조 | 5단계 고정 | 목표 보장, 측정 | 경직성 | 없음 |
| 감정 분류 | GPT API | Zero 설치, 정확도 | API 의존 | 월 $10 |
| Tool 패턴 | 모듈화 | 테스트 용이 | 코드 증가 | 개발 시간 +10% |

---

## 향후 개선 방향

### 1. 성능 최적화
```python
# 현재: 턴당 2~5초
# 목표: 턴당 1초 이하

개선안:
- LLM 스트리밍 응답
- 병렬 Tool 실행
- 프롬프트 최적화 (토큰 감소)
```

### 2. 확장성
```python
# 동시 사용자 1000명 대응
- Redis Cluster
- AI BE 수평 확장 (3대 이상)
- 로드 밸런서
```

### 3. 데이터 분석
```python
# PostgreSQL 추가
- 완료된 대화 영구 저장
- Stage별 성공률 분석
- A/B 테스트 (프롬프트 변경)
```

### 4. 비용 최적화
```python
# 월 사용자 10,000명 시나리오
현재: OpenAI API $100/월
개선:
- 간단한 발화: 키워드 분류 (무료)
- 복잡한 발화: GPT 분류
- 예상 절감: 50% ($50/월)
```

---

## 결론

이 아키텍처는 **교육 목표 달성**과 **기술적 실현 가능성**의 균형을 추구합니다.

**핵심 원칙:**
1. ✅ **안정성 우선**: Stage 순서 보장
2. ✅ **유연성 확보**: LLM으로 자연스러운 대화
3. ✅ **비용 효율**: 클라우드 서비스 활용
4. ✅ **확장 가능**: 모듈화된 구조

**트레이드오프 수용:**
- 복잡도 증가 → 교육 품질 향상
- 서버 비용 증가 → 개발 속도 향상
- API 의존 → 유지보수 감소

이 설계는 **MVP(Minimum Viable Product)로 빠르게 검증**하고,
**데이터 기반으로 점진적 개선**하는 전략을 기반으로 합니다.

