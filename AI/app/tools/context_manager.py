"""
TOOL 3: Context Manager
대화 컨텍스트 관리 및 동화 메타데이터 접근
"""
from langchain.tools import tool
from typing import Dict, List, Optional
import logging

from app.models.schemas import DialogueSession, Stage

logger = logging.getLogger(__name__)


# 동화 메타데이터 (기존 sel_characters.py)
SEL_CHARACTERS = {
    "콩쥐팥쥐": {
        "character_name": "콩쥐",
        "scene": "새어머니가 콩쥐에게 구멍 난 항아리에 물을 다 채우라고 시키며 괴롭히는 상황",
        "intro": "새어머니가 나한테 구멍 난 항아리에 물을 채우라고 했어. 이 장면을 보고 어떤 기분이 들었어?",
        "sel_skill": "자기인식 (자신과 타인의 감정을 분별하고 인식하기)",
        "safe_tags": ["Sequenced", "Focused"],
        "lesson": "감정을 표현하고 이해하는 것이 중요해요",
        "action_card": {
            "title": "지금 감정 말로 표현하기",
            "strategies": [
                "속상해 말하기",
                "좋았던 일 말하기",
                "감정 그림으로 그리기"
            ]
        }
    },
    "가난한 유산": {
        "character_name": "아버지",
        "scene": "가난하지만 자식에게 마음의 유산을 남기려는 아버지가 고민하는 상황",
        "intro": "우리 집은 가진 게 많지 않단다. 다른 사람들은 금덩이나 논밭을 남기지만, 나는 너에게 줄 게 이 낡은 나무상자 하나뿐이구나. 너라면 이 말을 들었을 때 어떤 기분이 들 것 같아?",
        "sel_skill": "자기인식 (물질보다 마음의 유산이 더 소중함을 느끼며, 자신이 소중히 여기는 감정을 인식하기)",
        "safe_tags": ["Explicit"],
        "lesson": "마음의 선물이 가장 소중한 선물이에요",
        "action_card": {
            "title": "오늘 고마운 사람에게 “고마워요”, “사랑해요” 한마디 해보기",
            "strategies": [
                "감사 카드 만들기",
                "고마운 사람에게 말하기",
                "하루 감사일기쓰기"
            ]
        }
    },
    "삼년 고개": {
        "character_name": "노인",
        "scene": "노인이 약속을 지키기 위해 삼년 고개를 오르며 힘든 길을 참아내는 상황",
        "intro": "나는 약속을 지키기 위해 무거운 돌을 지고 삼년 고개를 오르고 있어. 어떤 마음이 들 것 같아?",
        "sel_skill": "자기관리 (어려운 상황에서도 감정을 다스리고, 약속을 지키는 힘을 기르기)",
        "safe_tags": ["Sequenced", "Active"],
        "lesson": "힘들어도 약속을 지키는 것이 중요해요",
        "action_card": {
            "title": "작은 약속 지키기 연습하기",
            "strategies": [
                "5분 약속 지키기",
                "오늘 숙제 먼저하기",
                "작은 목표 체크리스트"
            ]
        }
    },
    "해님 달님": {
        "character_name": "누나",
        "scene": "호랑이가 오누이를 쫓아와 누나가 동생과 함께 도망치는 긴박한 순간",
        "intro": "호랑이가 우리를 쫓아와서 동생 손을 꼭 잡고 달렸어. 그때 내 마음은 어땠을까?",
        "sel_skill": "사회적 인식 (타인이 어떻게 느끼는지 판단하기 위해 사회적 단서 해석하기)",
        "safe_tags": ["Active", "Focused"],
        "lesson": "위험할 때 서로 도와야 해요",
        "action_card": {
            "title": "도움 필요한 친구 살펴보기",
            "strategies": [
                "친구 얼굴 살펴보기",
                "도와줄래 물어보기",
                "같이 놀아주기"
            ]
        }
    },
    "금도끼 은도끼": {
        "character_name": "나무꾼",
        "scene": "나무꾼이 연못에 빠진 도끼를 되찾으려 할 때 산신령이 금도끼와 은도끼를 내밀며 시험하는 순간",
        "intro": "내 도끼가 강물에 빠졌는데 산신령이 금도끼와 은도끼를 내밀었어. 너라면 뭐라고 대답했을까?",
        "sel_skill": "책임 있는 의사결정 (도덕적·규범적 기준을 고려하여 판단하고 결정하기)",
        "safe_tags": ["Explicit", "Active"],
        "lesson": "정직하게 행동하면 좋은 일이 생겨요",
        "action_card": {
            "title": "사실대로 말하기 연습하기",
            "strategies": [
                "진실 말하기 연습",
                "잘못했을 때 사과하기",
                "정직 칭찬받기"
            ]
        }
    }
}


class ContextManagerTool:
    """컨텍스트 관리 도구"""
    
    def __init__(self, use_redis: bool = True):
        """
        Args:
            use_redis: Redis 사용 여부 (False면 메모리 사용)
        """
        self.use_redis = use_redis
        self.sessions: Dict[str, DialogueSession] = {}  # Fallback: 메모리 저장
        
        if use_redis:
            try:
                from app.services.redis_service import get_redis_service
                self.redis = get_redis_service()
                logger.info("✅ ContextManager: Redis 모드")
            except Exception as e:
                logger.warning(f"⚠️ Redis 연결 실패, 메모리 모드로 전환: {e}")
                self.use_redis = False
                self.redis = None
        else:
            self.redis = None
            logger.info("✅ ContextManager: 메모리 모드")
    
    def get_story_context(self, story_name: str) -> Optional[Dict]:
        """
        동화 메타데이터 조회
        
        Args:
            story_name: 동화 제목
        
        Returns:
            동화 정보 dict 또는 None
        """
        context = SEL_CHARACTERS.get(story_name)
        if not context:
            logger.warning(f"등록되지 않은 동화: {story_name}")
            return None
        
        logger.info(f"동화 컨텍스트 조회: {story_name}")
        return context
    
    def get_previous_emotions(
        self, session_id: str, session: Optional[DialogueSession] = None
    ) -> List[str]:
        """
        이전 감정 히스토리 조회
        
        Args:
            session_id: 세션 ID
            session: DialogueSession 객체 (선택)
        
        Returns:
            감정 라벨 리스트
        """
        if session:
            return [e.value for e in session.emotion_history]
        
        sess = self.sessions.get(session_id)
        if sess:
            return [e.value for e in sess.emotion_history]
        
        return []
    
    def get_key_moments(
        self, session_id: str, session: Optional[DialogueSession] = None
    ) -> List[Dict]:
        """
        핵심 발화 조회 (S2, S3에서 사용)
        
        Args:
            session_id: 세션 ID
            session: DialogueSession 객체 (선택)
        
        Returns:
            핵심 발화 리스트
        """
        if session:
            return session.key_moments
        
        sess = self.sessions.get(session_id)
        if sess:
            return sess.key_moments
        
        return []
    
    def build_context_for_prompt(
        self,
        session: DialogueSession,
        stage: Stage
    ) -> Dict:
        """
        프롬프트에 전달할 컨텍스트 구성
        
        Args:
            story_name: 동화 제목
            session: 세션 객체
            stage: 현재 Stage
        
        Returns:
            컨텍스트 dict
        """
        story_context = self.get_story_context(session.story_name)
        
        context = {
            "story": story_context,
            "child_name": session.child_name,
            "current_stage": stage.value,
            "emotion_history": [e.value for e in session.emotion_history],
            "key_moments": session.key_moments
        }
        
        # Stage별 추가 컨텍스트
        if stage == Stage.S1_EMOTION_LABELING:
            context["instruction"] = "아이의 감정을 파악하고 공감하세요"
        
        elif stage == Stage.S2_ASK_EXPERIENCE:
            # S1에서 파악한 감정
            if session.emotion_history:
                context["identified_emotion"] = session.emotion_history[-1].value
        
        elif stage == Stage.S3_ACTION_SUGGESTION:
            # S2에서 파악한 상황
            s2_moments = [m for m in session.key_moments if m.get("stage") == "S2"]
            if s2_moments:
                context["situation"] = s2_moments[-1].get("content")
        
        elif stage == Stage.S4_LESSON_CONNECTION:
            # 동화 교훈 + 동화에 정의된 행동카드 하위 전략들 제공
            if story_context:
                action_card = story_context.get("action_card")
                # 기존 코드/다른 모듈과의 호환을 위해 context['action_card']에는 제목(문자열)을 넣어둡니다.
                if isinstance(action_card, dict):
                    context["action_card"] = action_card.get("title")
                    # S4에서 하위 전략(2-3개)을 프롬프트에 바로 전달
                    context["action_card_strategies"] = action_card.get("strategies", [])[:3]
                else:
                    context["action_card"] = action_card
                    context["action_card_strategies"] = []
        
        elif stage == Stage.S5_ACTION_CARD:
            # 전체 대화 요약
            context["all_turns"] = session.key_moments
        
        return context
    
    def save_session(self, session: DialogueSession):
        """세션 저장 (Redis 또는 메모리)"""
        if self.use_redis and self.redis:
            # Redis에 저장
            session_dict = session.dict()
            self.redis.save_session(session.session_id, session_dict)
            logger.info(f"세션 저장 (Redis): {session.session_id}")
        else:
            # 메모리에 저장
            self.sessions[session.session_id] = session
            logger.info(f"세션 저장 (메모리): {session.session_id}")
    
    def get_session(self, session_id: str) -> Optional[DialogueSession]:
        """세션 조회 (Redis 또는 메모리)"""
        if self.use_redis and self.redis:
            # Redis에서 조회
            session_dict = self.redis.get_session(session_id)
            if session_dict:
                # dict → DialogueSession 변환
                return DialogueSession(**session_dict)
            return None
        else:
            # 메모리에서 조회
            return self.sessions.get(session_id)
    
    def delete_session(self, session_id: str) -> bool:
        """세션 삭제"""
        if self.use_redis and self.redis:
            return self.redis.delete_session(session_id)
        else:
            if session_id in self.sessions:
                del self.sessions[session_id]
                return True
            return False
    
    def extend_session_ttl(self, session_id: str, ttl: int = None) -> bool:
        """세션 만료 시간 연장 (Redis만)"""
        if self.use_redis and self.redis:
            return self.redis.extend_session_ttl(session_id, ttl)
        return False


# Singleton 인스턴스
_context_manager_instance = None

def get_context_manager() -> ContextManagerTool:
    """싱글톤 컨텍스트 매니저 반환"""
    global _context_manager_instance
    if _context_manager_instance is None:
        _context_manager_instance = ContextManagerTool()
    return _context_manager_instance


# LangChain Tool 래퍼
@tool
def context_manager_tool(action: str, **kwargs) -> Dict:
    """
    대화 컨텍스트를 관리합니다.
    동화 정보, 이전 감정, 핵심 발화 등을 조회할 수 있습니다.
    
    Args:
        action: "get_story" | "get_emotions" | "get_moments"
        **kwargs: 액션별 파라미터
    
    Returns:
        dict: 조회 결과
    """
    manager = get_context_manager()
    
    if action == "get_story":
        story_name = kwargs.get("story_name")
        return manager.get_story_context(story_name) or {}
    
    elif action == "get_emotions":
        session_id = kwargs.get("session_id")
        return {"emotions": manager.get_previous_emotions(session_id)}
    
    elif action == "get_moments":
        session_id = kwargs.get("session_id")
        return {"moments": manager.get_key_moments(session_id)}
    
    return {"error": "Unknown action"}


if __name__ == "__main__":
    # 테스트
    manager = ContextManagerTool()
    
    # 동화 정보 조회
    story = manager.get_story_context("콩쥐팥쥐")
    print("동화 정보:", story)
    
    # 빌드 컨텍스트
    from app.models.schemas import DialogueSession, Stage, EmotionLabel
    session = DialogueSession(
        session_id="test-123",
        child_name="지민",
        story_name="콩쥐팥쥐",
        current_stage=Stage.S2_ASK_EXPERIENCE,
        emotion_history=[EmotionLabel.SAD]
    )
    
    context = manager.build_context_for_prompt(
        "콩쥐팥쥐", session, Stage.S2_ASK_EXPERIENCE
    )
    print("\n프롬프트 컨텍스트:", context)

