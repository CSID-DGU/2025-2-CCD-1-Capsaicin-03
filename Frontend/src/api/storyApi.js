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

export const saveLastReadPage = async (storyId, childId, pageNumber, isEnd = false) => {
  const API_ENDPOINT = `/api/stories/${storyId}/children/${childId}/pages`;

  const body = {
    page_number: pageNumber,
    is_end: isEnd
  };

  try {
    const response = await instance.patch(API_ENDPOINT, body);
    return response.data;
  } catch (error) {
    console.error('Failed to save page:', error.message);
    throw error;
  }
};

export const saveLastReadPageOnExit = (storyId, childId, pageNumber, isEnd = false) => {
  const BASE_URL = 'http://43.203.13.222:8080'; 
  const URL = `${BASE_URL}/api/stories/${storyId}/children/${childId}/pages`;

  let token = null;
  const storageKey = Object.keys(localStorage).find(key => key.startsWith('sb-') && key.endsWith('-auth-token'));
  const sessionString = storageKey ? localStorage.getItem(storageKey) : null;

  if (sessionString) {
    try {
      const session = JSON.parse(sessionString);
      token = session.access_token; 
    } catch (e) {
      console.error("[Exit Save] 토큰 파싱 실패:", e);
    }
  }

  console.log(`[EXIT DEBUG] 토큰 찾음: ${!!token} (Key: ${storageKey})`);
  
  const body = JSON.stringify({
    page_number: pageNumber,
    is_end: isEnd
  });

  fetch(URL, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
    },
    body: body,
    keepalive: true 
  }).catch(e => console.error("Exit save failed:", e));
};