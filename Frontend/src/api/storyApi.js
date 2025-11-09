// src/api/storyApi.js
import instance from './axiosInstance.js';

/**
 * 카테고리별 동화 목록을 조회하는 API
 * @param {string} categoryCode - CASEL 역량 코드 (SA, SM, SOA, RS, RDM)
 * @returns {Promise<object>} API 응답 데이터 (data 객체)
 */
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

/**
 * 동화 상세 정보를 조회하는 API (story-id 기준)
 * @param {string|number} storyId - 조회할 동화의 ID
 * @returns {Promise<object>} API 응답 데이터 (data 객체)
 */
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

/**
 * 동화 장면 상세 정보를 조회하는 API (story-id 기준)
 * @param {string|number} storyId - 조회할 동화의 ID
 * @returns {Promise<object>} API 응답 데이터 (data 객체: scene_num, text_content 등)
 */
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