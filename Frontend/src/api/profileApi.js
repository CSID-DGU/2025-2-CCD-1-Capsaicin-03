// src/api/profileApi.js

import apiClient from './axiosInstance.js'; 

export const createChildProfile = async ({ name, birthYear }) => {
  try {
    const response = await apiClient.post('/api/users/children', { name, birthYear });
    return response.data;

  } catch (error) {
    console.error('아이 프로필 생성 실패:', error.message);
    
    throw error;
  }
};

export const getChildProfile = async () => {
  try {
    const response = await apiClient.get('/api/users/children');
    return response.data; 

  } catch (error) {
    console.error('아이 프로필 조회 실패:', error.message);
    throw error;
  }
};
