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
  // 브라우저 녹음 파일(webm/blob)을 파일 객체로 변환하여 추가
  const audioFile = new File([audioBlob], "user_response.webm", { type: "audio/webm" });
  formData.append('audio', audioFile);

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