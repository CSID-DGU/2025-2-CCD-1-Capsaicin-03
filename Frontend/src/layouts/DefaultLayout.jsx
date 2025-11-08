// src/layouts/DefaultLayout.jsx
import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { supabase } from '../supabaseClient'; // 2. supabase 클라이언트 추가 (경로 확인!)
const DefaultLayout = () => {

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // (디버깅용)
        console.log(`Supabase auth event: ${event}`);

        if (event === 'SIGNED_IN') {
          console.log('로그인 됨:', session?.user?.email);
        }

        if (event === 'SIGNED_OUT') {
          console.log('로그아웃 됨');
        }
      }
    );

    // 컴포넌트가 사라질 때 (앱 종료 등) 리스너를 정리(해제)
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []); 


  return (
    <div className="app-container">

      <Outlet />
    </div>
  );
};

export default DefaultLayout;