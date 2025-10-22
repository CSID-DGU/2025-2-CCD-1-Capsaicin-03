// src/layouts/GuestLayout.jsx
import React, { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { supabase } from '../supabaseClient'; // Supabase 클라이언트 가져오기

const GuestLayout = () => {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null); // 1. 에러를 저장할 상태 추가

  useEffect(() => {
    const checkSession = async () => {
      try { // 2. try...catch로 에러 잡기
        
        console.log('GuestLayout: Supabase 클라이언트 확인:', supabase);
        if (!supabase) {
          // supabase 객체 자체가 로드 안됐을 경우
          throw new Error("Supabase client is not defined or imported correctly.");
        }

        console.log('GuestLayout: getSession 시도...');
        // 3. Supabase 함수가 반환하는 에러도 확인
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          // Supabase API가 에러를 반환한 경우
          throw sessionError;
        }
        
        console.log('GuestLayout: getSession 성공:', session);
        setSession(session);

      } catch (err) {
        // 4. 어떤 에러든 잡아서 콘솔과 상태에 저장
        console.error('GuestLayout checkSession 에러:', err); 
        setError(err.message || 'An unknown error occurred');
      } finally {
        // 5. 성공하든 실패하든 무조건 로딩 상태를 false로 변경
        console.log('GuestLayout: 로딩 종료');
        setLoading(false); 
      }
    };

    checkSession();
  }, []);

  // 6. 만약 에러가 발생했다면, 로딩 대신 에러 메시지를 화면에 표시
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

  // 7. 로딩 중일 때 (정상)
  if (loading) {
    return <div>Loading...</div>;
  }

  // 8. 로딩이 끝났고 에러도 없을 때 (정상)
  console.log('GuestLayout 렌더링:', session ? 'stories로 이동' : 'Outlet 표시');
  
  /*return session ? <Navigate to="/stories" replace /> : <Outlet />;*/
  return <Outlet />;
};

export default GuestLayout;