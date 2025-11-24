// src/layouts/DefaultLayout.jsx

import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient'; 
import ReactGA from 'react-ga4';

const DefaultLayout = () => {
  const location = useLocation();

  useEffect(() => {
    ReactGA.send({ hitType: "pageview", page: location.pathname });
    console.log(`[Analytics] 페이지 이동: ${location.pathname}`);
  }, [location]); 

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log(`Supabase auth event: ${event}`);

        if (event === 'SIGNED_IN') {
          console.log('로그인 됨:', session?.user?.email);
          ReactGA.set({ userId: session.user.id });
        }

        if (event === 'SIGNED_OUT') {
          console.log('로그아웃 됨');
          ReactGA.set({ userId: null });
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