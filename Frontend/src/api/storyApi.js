// src/api/storyApi.js
import instance from './axiosInstance.js';

export const fetchStoriesByCategory = async (categoryCode) => {

  const API_ENDPOINT = `/api/stories?category=${categoryCode}`;

  try {
    const response = await instance.get(API_ENDPOINT);

    if (!response.data.success) {
      throw new Error(response.data.message || '데이터 로딩 실패');
    }
    
    return response.data.data; 

  } catch (error) {
    console.error('Fetching stories failed in categoryApi:', error.message);
    throw error; 
  }
};

export const fetchStoryById = async (storyId) => {
  const API_ENDPOINT = `/api/stories/${storyId}`;

  try {
    const response = await instance.get(API_ENDPOINT);

    if (!response.data.success) {
      throw new Error(response.data.message || '데이터 로딩 실패');
    }
    return response.data.data; 

  } catch (error) {
    console.error(`Fetching story (id: ${storyId}) failed:`, error.message);
    throw error; 
  }
};

export const fetchStoryScene = async (storyId) => {
  const API_ENDPOINT = `/api/stories/${storyId}/scene`;

  try {
    const response = await instance.get(API_ENDPOINT);

    if (!response.data.success) {
      throw new Error(response.data.message || '장면 데이터 로딩 실패');
    }
    return response.data.data; 

  } catch (error) {
    console.error(`Fetching story scene (storyId: ${storyId}) failed:`, error.message);
    throw error; 
  }
};