// src/layouts/GuestLayout.jsx
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

const GuestLayout = () => {
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';

  // 이미 로그인했다면 동화 목록으로 보내고, 아니면 자식 컴포넌트(로그인 페이지 등)를 보여줍니다.
  return isLoggedIn ? <Navigate to="/stories" replace /> : <Outlet />;
};

export default GuestLayout;