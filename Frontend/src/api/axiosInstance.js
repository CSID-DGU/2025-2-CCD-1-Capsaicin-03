// src/api/axiosInstance.js

import axios from 'axios';
import { supabase } from '../supabaseClient';

// Axios 인스턴스 생성
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 요청 인터셉터 (Request Interceptor)
// (Supabase 세션에서 토큰을 가져와 헤더에 주입)
apiClient.interceptors.request.use(
  async (config) => {
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error) {
      console.error('Error getting Supabase session:', error.message);
      return Promise.reject(error);
    }

    if (session && session.access_token) {
      config.headers['Authorization'] = `Bearer ${session.access_token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 응답 인터셉터 (Response Interceptor) - 토큰 자동 갱신
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // 401 에러(토큰 만료)이고, 재시도한 적이 없는 경우
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true; // 재시도 플래그 설정
      
      try {
        // Supabase에 토큰 갱신 요청
        const { data, error: refreshError } = await supabase.auth.refreshSession();

        if (refreshError || !data.session) {
          throw new Error('Supabase session refresh failed.');
        }

        // Supabase는 자동으로 새 토큰을 스토리지에 저장
        // 새 토큰으로 원래 요청의 헤더를 갱신
        const newAccessToken = data.session.access_token;
        originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
        
        // 새 토큰으로 다시 요청
        return apiClient(originalRequest);

      } catch (e) {
        console.error('Session refresh failed. Redirecting to login.');
        // 갱신 실패 시 로그인 페이지로 리디렉션 처리
        window.location.href = '/login'; 
        return Promise.reject(e);
      }
    }
    
    // 401 이외의 에러는 그대로 반환
    const errorMessage = 
      error.response?.data?.message || error.message || "알 수 없는 에러 발생";
    
    return Promise.reject(new Error(errorMessage));
  }
);

export default apiClient;