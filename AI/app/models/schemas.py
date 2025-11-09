"""
Pydantic 스키마 정의
대화 턴, 세션, AI 응답 등 모든 데이터 구조를 정의
"""
from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Literal
from datetime import datetime
from enum import Enum


# ========================================
# Enum: Stage, 감정, 도구 타입
# ========================================

class Stage(str, Enum):
    """대화 단계"""
    S1_EMOTION_LABELING = "S1"     # 감정 라벨링
    S2_ASK_EXPERIENCE = "S2"     # 원인 탐색
    S3_ACTION_SUGGESTION = "S3"     # 대안 제시
    S4_LESSON_CONNECTION = "S4"     # 교훈 연결
    S5_ACTION_CARD = "S5"           # 행동카드 생성


class ToolType(str, Enum):
    """사용 가능한 Tool 타입"""
    SAFETY_FILTER = "safety_filter"
    EMOTION_CLASSIFIER = "emotion_classifier"
    CONTEXT_MANAGER = "context_manager"
    ACTION_CARD_GENERATOR = "action_card_generator"


class EmotionLabel(str, Enum):
    """감정 라벨 (6가지 기본 감정)"""
    HAPPY = "행복"
    SAD = "슬픔"
    ANGRY = "분노"
    FEAR = "두려움"
    SURPRISE = "놀람"
    DISGUST = "혐오"
    NEUTRAL = "중립"


# ========================================
# Request/Response: API 입출력
# ========================================

class DialogueTurnRequest(BaseModel):
    """대화 턴 처리 요청"""
    session_id: str = Field(..., description="세션 고유 ID")
    turn_number: int = Field(..., ge=1, description="현재 턴 번호 (1부터 시작)")
    stage: Stage = Field(..., description="현재 Stage (S1~S5)")
    
    # 동화 컨텍스트
    story_name: str = Field(..., description="동화 제목 (예: 콩쥐팥쥐)")
    story_theme: str = Field(..., description="동화 주제 (예: 분노조절)")
    safe_tags: List[str] = Field(default=[], description="SAFE 원칙 태그")
    
    # 아동 정보
    child_name: str = Field(..., min_length=1, max_length=20, description="아동 이름")
    child_age: Optional[int] = Field(None, ge=4, le=10, description="아동 나이")
    
    # 음성 데이터
    audio_file: Optional[str] = Field(None, description="Base64 인코딩된 오디오 또는 S3 URL")
    audio_format: str = Field(default="webm", description="오디오 파일 형식")
    
    # 대화 히스토리 (컨텍스트 유지)
    previous_turns: List[Dict[str, str]] = Field(
        default=[],
        description="이전 대화 턴들 [{'role': 'ai'|'child', 'content': str, 'stage': str}]"
    )
    
    @validator("story_name")
    def validate_story_name(cls, v):
        # 등록된 동화인지 확인 (나중에 SEL_CHARACTERS와 연동)
        if not v.strip():
            raise ValueError("story_name은 비어있을 수 없습니다")
        return v.strip()
    
    @validator("audio_file")
    def validate_audio(cls, v, values):
        """audio_file이 있으면 형식 검증"""
        if v and not v.startswith("data:audio") and not v.startswith("http"):
            # Base64나 URL이 아니면 에러
            raise ValueError("audio_file은 Base64 또는 URL이어야 합니다")
        return v


class STTResult(BaseModel):
    """STT 변환 결과"""
    text: str = Field(..., description="변환된 텍스트")
    confidence: float = Field(..., ge=0.0, le=1.0, description="신뢰도")
    language: str = Field(default="ko", description="인식된 언어")


class SafetyCheckResult(BaseModel):
    """안전 필터 결과"""
    is_safe: bool = Field(..., description="안전 여부")
    flagged_categories: List[str] = Field(default=[], description="위반 카테고리")
    message: Optional[str] = Field(None, description="경고 메시지")


class EmotionResult(BaseModel):
    """감정 분석 결과"""
    primary: EmotionLabel = Field(..., description="주 감정")
    secondary: List[EmotionLabel] = Field(default=[], description="부 감정")
    confidence: float = Field(..., ge=0.0, le=1.0, description="신뢰도")
    raw_scores: Optional[Dict[str, float]] = Field(None, description="원본 점수")


class AISpeech(BaseModel):
    """AI 발화 내용"""
    text: str = Field(..., description="AI 응답 텍스트")
    tts_url: Optional[str] = Field(None, description="TTS 오디오 URL")
    duration_ms: Optional[int] = Field(None, description="오디오 길이 (밀리초)")


class ActionItems(BaseModel):
    """아이에게 제시할 액션 아이템"""
    type: Literal["emotion_selection", "yes_no", "open_question", "action_card"] = Field(
        ..., description="액션 타입"
    )
    options: Optional[List[str]] = Field(None, description="선택지 (있는 경우)")
    instruction: Optional[str] = Field(None, description="사용자 안내 메시지")


class ActionCard(BaseModel):
    """행동 카드 (S5 단계 최종 산출물)"""
    title: str = Field(..., max_length=15, description="행동카드 제목 (15자 이내)")
    description: str = Field(..., max_length=50, description="행동 설명")
    icon: str = Field(default="🌟", description="아이콘 이모지")
    parent_guide: List[str] = Field(..., max_length=3, description="부모 코칭 가이드 (3줄)")
    created_at: datetime = Field(default_factory=datetime.now)


class DialogueTurnResponse(BaseModel):
    """대화 턴 처리 응답"""
    success: bool = Field(..., description="처리 성공 여부")
    session_id: str
    turn_number: int
    stage: Stage
    
    # 처리 결과
    result: Dict = Field(
        ...,
        description="""
        단계별 결과 포함:
        {
            "stt_result": STTResult,
            "safety_check": SafetyCheckResult,
            "emotion_detected": EmotionResult (S1만),
            "ai_response": AISpeech,
            "action_items": ActionItems,
            "action_card": ActionCard (S5만)
        }
        """
    )
    
    # 상태 관리
    next_stage: Stage = Field(..., description="다음 Stage (현재 유지 or 전환)")
    fallback_triggered: bool = Field(default=False, description="Fallback 전략 사용 여부")
    retry_count: int = Field(default=0, description="현재 Stage 재시도 횟수")
    
    # 메타데이터
    processing_time_ms: int = Field(..., description="처리 시간 (밀리초)")
    timestamp: datetime = Field(default_factory=datetime.now)


class ErrorResponse(BaseModel):
    """에러 응답"""
    success: bool = False
    error: Dict = Field(
        ...,
        description="""
        {
            "code": str,
            "message": str,
            "retry_strategy": str,
            "fallback_options": List[str]
        }
        """
    )
    timestamp: datetime = Field(default_factory=datetime.now)


# ========================================
# Session Management
# ========================================

class DialogueSession(BaseModel):
    """대화 세션 (메모리 또는 DB 저장)"""
    session_id: str
    child_name: str
    story_name: str
    
    # 상태
    current_stage: Stage = Stage.S1_EMOTION_LABELING
    current_turn: int = 1
    retry_count: int = 0
    
    # 컨텍스트 누적
    emotion_history: List[EmotionLabel] = []
    key_moments: List[Dict] = []  # {"stage": "S2", "content": "엄마가 화났어요"}
    
    # 메타데이터
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    is_active: bool = True


# ========================================
# Tool 결과 스키마
# ========================================

class ToolResult(BaseModel):
    """Tool 실행 결과"""
    tool_name: ToolType
    success: bool
    result: Dict  # Tool마다 다른 구조
    error: Optional[str] = None
    execution_time_ms: int


# ========================================
# Orchestrator 내부 상태
# ========================================

class StageConfig(BaseModel):
    """각 Stage별 설정"""
    stage: Stage
    required_tools: List[ToolType]  # 필수 도구
    prompt_template: str            # 프롬프트 템플릿 경로
    success_criteria: str           # 성공 조건 설명
    fallback_strategy: Dict         # Fallback 전략
    max_retry: int = 3

