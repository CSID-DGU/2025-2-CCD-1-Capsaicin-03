// src/api/profileApi.js

import apiClient from './axiosInstance.js'; 

/**
 * 자녀 프로필을 생성합니다.
 * API: POST /api/users/children
 * @param {object} profileData - 프로필 데이터
 * @param {string} profileData.name - 아이 이름
 * @param {string} profileData.birthYear - 아이 생년 (YYYY)
 */

export const createChildProfile = async ({ name, birthYear }) => {
  try {
    const response = await apiClient.post('/api/users/children', { name, birthYear });
    return response.data;

  } catch (error) {
    console.error('Error creating child profile:', error.message);
    
    throw error;
  }
};
