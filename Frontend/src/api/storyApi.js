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
export const fetchLastReadPage = async (storyId, childId) => {
  const API_ENDPOINT = `/api/stories/${storyId}/children/${childId}/pages`;

  try {
    const response = await instance.get(API_ENDPOINT);
    if (!response.data.success) {
       return null;
    }
    return response.data.data; 
  } catch (error) {
    console.error('Failed to fetch last read page:', error.message);
    return null; 
  }
};

export const saveLastReadPage = async (storyId, childId, pageNumber) => {
  const API_ENDPOINT = `/api/stories/${storyId}/children/${childId}/pages/${pageNumber}`;

  try {
    const response = await instance.patch(API_ENDPOINT);
    return response.data;
  } catch (error) {
    console.error('Failed to save page:', error.message);
    throw error;
  }
};