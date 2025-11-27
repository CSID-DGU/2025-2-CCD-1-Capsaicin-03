// src/api/parentsApi.js

import apiClient from './axiosInstance';

export const getChatList = async () => {
  try {
    const response = await apiClient.get('/api/conversations');
    return response.data; 
  } catch (error) {
    console.error('대화 목록 조회 중 오류 발생:', error);
    throw error;
  }
};

export const getChatDetail = async (conversationId) => {
  try {
    // path parameter로 conversationId 전달
    const response = await apiClient.get(`/api/conversations/${conversationId}`);
    return response.data;
  } catch (error) {
    console.error(`대화 상세 조회 중 오류 발생 (ID: ${conversationId}):`, error);
    throw error;
  }
};

export const getFeedbackList = async () => {
  try {
    const response = await apiClient.get('/api/feedback');
    return response.data; 
  } catch (error) {
    console.error('피드백 목록 조회 중 오류 발생:', error);
    throw error;
  }
};

export const getFeedbackDetail = async (feedbackId) => {
  try {
    const response = await apiClient.get(`/api/feedback/${feedbackId}`);
    return response.data; 
  } catch (error) {
    console.error(`피드백 상세 조회 중 오류 발생 (ID: ${feedbackId}):`, error);
    throw error;
  }
};