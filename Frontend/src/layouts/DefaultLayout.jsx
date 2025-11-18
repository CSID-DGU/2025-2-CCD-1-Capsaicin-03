// src/layouts/DefaultLayout.jsx
import React from 'react';
import { Outlet } from 'react-router-dom';

const DefaultLayout = () => {
  return (
    <div className="app-container">
      {/* 이 안으로 자식 경로의 컴포넌트가 렌더링됩니다. */}
      <Outlet />
    </div>
  );
};

export default DefaultLayout;