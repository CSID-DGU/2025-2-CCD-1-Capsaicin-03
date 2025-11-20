// src/layouts/GuestLayout.jsx
import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { supabase } from '../supabaseClient'; 
import { getChildProfile } from '../api/profileApi';

const GuestLayout = () => {
  const [redirectPath, setRedirectPath] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUserStatus = async () => {
      try { 
        // 세션 확인
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          // 로그인이 안 되어 있으면 -> 로딩 끝내고 원래 보여주려던 화면(Home, Login 등) 보여줌
          setLoading(false);
          return;
        }

        console.log("로그인 확인됨. 백엔드 API로 프로필 조회 시도...");

        // 로그인 되어 있다면 -> 백엔드 API 조회(프로필 조회)
        try {
          const response = await getChildProfile();

          // 백엔드 응답에 success가 true이고 data가 있으면 -> 기존 유저
          if (response && response.success && response.data) {
            console.log("기존 유저 확인 -> /stories");
            setRedirectPath('/stories'); 
          } else {
            // 응답은 왔는데 데이터가 비어있다면 -> 신규 유저
            throw new Error("프로필 데이터 없음");
          }

        } catch (apiError) {
          // API 에러 발생 (404 Not Found 등) -> 신규 유저로 간주
          console.log("신규 유저(또는 조회 실패) -> /setup");
          setRedirectPath('/setup'); 
        }

      } catch (err) {
        console.error("GuestLayout 시스템 에러:", err);
        setLoading(false);
      } finally {
        setLoading(false); 
      }
    };

    checkUserStatus();
  }, []);

  if (loading) return <div>잠시만 기다려주세요...</div>; 

  // 리디렉션 경로가 정해졌으면 그 경로로 리디렉션 (홈 화면 안 보여줌)
  if (redirectPath) return <Navigate to={redirectPath} replace />;

  // 비로그인 상태일 때만 자식 컴포넌트(홈, 로그인 등)를 보여줌
  return <Outlet />;
};

export default GuestLayout;