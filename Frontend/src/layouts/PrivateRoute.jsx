// src/layouts/PrivateRoute.jsx
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

const PrivateRoute = () => {
  // TODO: 실제로는 Supabase나 다른 인증 상태를 확인하는 로직이 필요합니다.
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';

  // 로그인 상태이면 자식 컴포넌트를 보여주고, 아니면 로그인 페이지로 보냅니다.
  return isLoggedIn ? <Outlet /> : <Navigate to="/login" replace />;
};

export default PrivateRoute;