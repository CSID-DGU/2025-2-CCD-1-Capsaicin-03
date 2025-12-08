// src/api/chatApi.js
import apiClient from './axiosInstance.js';

export const getLearningGoal = async (storyId) => {
  try {
    const response = await apiClient.get(`/api/stories/${storyId}/scene`);

    if (response.data && response.data.success) {
      return { data: response.data.data, error: null };
    } else {
      return { data: null, error: { message: response.data.message || 'API call failed' } };
    }

  } catch (error) {
    console.error('Error fetching learning goal in API:', error);
    return { data: null, error };
  }
};

export const fetchIntroQuestion = async (storyId) => {
  if (!storyId) {
    throw new Error("Story ID가 필요합니다.");
  }

  try {
    const response = await apiClient.get(`/api/stories/${storyId}/intro-question`);
    return response.data.data;
  } catch (error) {
    console.error("첫번째 질문 로딩 실패:", error);
    throw error;
  }
};

export const postConversationTurn = async ({ 
  storyId, 
  sessionId, 
  childId, 
  stage, 
  audioBlob 
}) => {
  if (!audioBlob) throw new Error("전송할 오디오 데이터가 없습니다.");

  const formData = new FormData();
  const mimeType = audioBlob.type; 
  
  let ext = 'webm'; 
  if (mimeType.includes('mp4') || mimeType.includes('aac')) {
    ext = 'mp4';
  } else if (mimeType.includes('ogg')) {
    ext = 'ogg';
  } else if (mimeType.includes('wav')) {
    ext = 'wav';
  }
  formData.append('audio', audioBlob, `user_response.${ext}`);

  try {
    const response = await apiClient.post('/api/conversations/turn', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      params: {
        session_id: sessionId,
        child_id: childId,
        story_id: storyId,
        stage: stage
      }
    });
    
    return response.data.data; 
  } catch (error) {
    console.error("대화 턴 전송 실패:", error);
    throw error;
  }
};

export const failConversation = async (conversationId) => {
    try {
        const response = await apiClient.patch(`/api/conversations/${conversationId}/fail`);
        return response.data;
    } catch (error) {
        console.error("대화 중단 처리 실패:", error);
    }
};

export const fetchActionCard = async (storyId) => {
  if (!storyId) {
    throw new Error("Story ID가 필요합니다.");
  }

  try {
    const response = await apiClient.get(`/api/stories/${storyId}/action-card`);
    return response.data.data;
  } catch (error) {
    console.error("행동 카드 로딩 실패:", error);
    throw error; 
  }
};