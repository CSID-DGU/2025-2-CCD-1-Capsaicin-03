"""
FastAPI 메인 애플리케이션
"""
from dotenv import load_dotenv
import os

# .env 파일 로드 (최우선)
env_path = os.path.join(os.path.dirname(__file__), '.env')
load_dotenv(env_path)
# load_dotenv()
# print("Loaded key:", os.getenv("OPENAI_API_KEY"))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging
import sys

from app.api.v1 import dialogue

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)

logger = logging.getLogger(__name__)

# FastAPI 앱 생성
app = FastAPI(
    title="AI Dialogue Agent Engine",
    description="SEL 교육용 대화 AI 엔진",
    version="1.0.0"
)

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 프로덕션에서는 특정 도메인만 허용
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 라우터 등록
app.include_router(
    dialogue.router,
    prefix="/api/v1/dialogue",
    tags=["dialogue"]
)


@app.on_event("startup")
async def startup_event():
    """앱 시작 시 실행"""
    logger.info("=" * 60)
    logger.info("AI Dialogue Agent Engine 시작")
    logger.info("=" * 60)
    
    # Tools 초기화 (싱글톤)
    from app.tools.emotion_classifier import get_emotion_classifier
    from app.tools.context_manager import get_context_manager
    from app.services.redis_service import get_redis_service
    
    # Redis 연결 확인
    try:
        logger.info("Redis 연결 확인 중...")
        redis_service = get_redis_service()
        if redis_service.ping():
            logger.info("✅ Redis 연결 성공")
        else:
            logger.warning("⚠️ Redis 연결 실패, 메모리 모드로 전환")
    except Exception as e:
        logger.warning(f"⚠️ Redis 사용 불가: {e}")
    
    logger.info("감정 분류기 초기화 중 (GPT 기반)...")
    get_emotion_classifier()
    logger.info("✅ 감정 분류기 초기화 완료")
    
    logger.info("컨텍스트 매니저 초기화...")
    get_context_manager()
    logger.info("✅ 컨텍스트 매니저 초기화 완료")
    
    logger.info("🚀 서버 준비 완료")


@app.on_event("shutdown")
async def shutdown_event():
    """앱 종료 시 실행"""
    logger.info("서버 종료 중...")


@app.get("/")
async def root():
    """헬스 체크"""
    return {
        "status": "ok",
        "message": "AI Dialogue Agent Engine is running",
        "version": "1.0.0"
    }


@app.get("/health")
async def health_check():
    """상세 헬스 체크"""
    # 각 컴포넌트 상태 확인
    status = {
        "api": "ok",
        "redis": "unknown",
        "emotion_classifier": "ok",
        "context_manager": "ok"
    }
    
    # Redis 상태
    try:
        from app.services.redis_service import get_redis_service
        redis_service = get_redis_service()
        if redis_service.ping():
            status["redis"] = "ok"
            status["redis_sessions"] = redis_service.count_sessions()
        else:
            status["redis"] = "disconnected"
    except Exception as e:
        status["redis"] = f"error: {str(e)}"
    
    # Emotion Classifier 상태
    try:
        from app.tools.emotion_classifier import get_emotion_classifier
        classifier = get_emotion_classifier()
        if classifier:
            status["emotion_classifier"] = "ok"
    except Exception as e:
        status["emotion_classifier"] = f"error: {str(e)}"
    
    return {
        "status": "ok",
        "components": status
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True  # 개발 모드
    )

