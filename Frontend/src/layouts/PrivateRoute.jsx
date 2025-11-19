// src/layouts/PrivateRoute.jsx
import React, { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { supabase } from '../supabaseClient'; // 1. Supabase 클라이언트 가져오기 (경로!)

const PrivateRoute = () => {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 2. Supabase에게 현재 세션(로그인 정보)이 있는지 물어봅니다.
    const checkSession = async () => {
      // getSession()은 로딩 시 한 번만 호출해도 
      // 로컬 스토리지에서 토큰을 자동으로 확인합니다.
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setLoading(false); // 3. 확인 완료
    };

    checkSession();
  }, []);

  // 4. 세션을 확인하는 동안 로딩 표시
  if (loading) {
    return <div>Loading...</div>; // TODO: 나중에 예쁜 스피너로 바꾸세요
  }

  // 5. 로딩이 끝난 후:
  // 세션이 있으면(로그인 O) 자식 컴포넌트(stories 등)를 보여주고,
  // 세션이 없으면(로그인 X) 로그인 페이지로 보냅니다.
  return session ? <Outlet /> : <Navigate to="/login" replace />;
};

export default PrivateRoute;