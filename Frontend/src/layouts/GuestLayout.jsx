// src/layouts/GuestLayout.jsx
import React, { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { supabase } from '../supabaseClient'; 

const GuestLayout = () => {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null); 

  useEffect(() => {
    const checkSession = async () => {
      try { 
        
        console.log('GuestLayout: Supabase 클라이언트 확인:', supabase);
        if (!supabase) {
          throw new Error("Supabase client is not defined or imported correctly.");
        }

        console.log('GuestLayout: getSession 시도...');
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }
        
        console.log('GuestLayout: getSession 성공:', session);
        setSession(session);

      } catch (err) {
        console.error('GuestLayout checkSession 에러:', err); 
        setError(err.message || 'An unknown error occurred');
      } finally {
        console.log('GuestLayout: 로딩 종료');
        setLoading(false); 
      }
    };

    checkSession();
  }, []);

  if (error) {
    return (
      <div style={{ padding: 20, color: 'red', backgroundColor: 'white' }}>
        <h1>GuestLayout Error:</h1>
        <p>Supabase 세션을 확인하는 중 에러가 발생했습니다.</p>
        <pre><strong>{error}</strong></pre>
        <p>---</p>
        <p>1. .env 파일에 VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY가 올바른지 확인하세요.</p>
        <p>2. src/supabaseClient.js 파일에 오타가 없는지 확인하세요.</p>
        <p>3. 터미널에서 서버를 껐다 켰는지 확인하세요 (Ctrl + C → npm run dev).</p>
      </div>
    );
  }

  if (loading) {
    return <div>Loading...</div>;
  }

  console.log('GuestLayout 렌더링:', session ? 'stories로 이동' : 'Outlet 표시');
  
  return session ? <Navigate to="/stories" replace /> : <Outlet />; //로그인했으면 바로 스토리목록 페이지로 이동
  /*return <Outlet />;*/
};

export default GuestLayout;