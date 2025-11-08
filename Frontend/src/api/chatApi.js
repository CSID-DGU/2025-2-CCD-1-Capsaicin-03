// src/api/chatApi.js
import apiClient from './axiosInstance.js';

/**
 * storyId에 해당하는 첫 번째 씬의 학습 목표를 가져옵니다.
 * @param {string} storyId - 동화 ID
 * @returns {Promise<{ data: any, error: any }>}
 */
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

/**
 * 동화별 첫번째 질문 조회 API
 * GET /api/stories/{storyId}/intro-question
 */
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

/**
 * 동화별 행동 카드 조회 API
 * GET /api/stories/{storyId}/action-card
 */
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