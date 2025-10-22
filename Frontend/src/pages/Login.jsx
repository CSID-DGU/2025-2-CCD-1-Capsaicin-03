// src/pages/Login.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
// 1. supabase 클라이언트를 import 합니다. (경로 확인 필수!)
import { supabase } from '../supabaseClient'; // './supabaseClient' 또는 '../supabaseClient' 등 경로 확인

const Login = () => {
  const navigate = useNavigate(); // navigate는 일단 둡니다.

  // 2. handleSignIn 함수를 async 함수로 변경하고, Supabase 로그인 로직을 추가합니다.
  const handleSignIn = async () => {
    console.log('구글 로그인 버튼 클릭됨. Supabase 인증을 시작합니다.');

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        // 3. 로그인 성공 후 리디렉션될 경로를 지정합니다.
        redirectTo: `${window.location.origin}/setup`
      }
    });

    // 만약 오류가 발생하면 콘솔에 출력합니다.
    if (error) {
      console.error('Google 로그인 중 오류 발생:', error.message);
    }
  };

  return (
    <div style={styles.container}>

      <div style={{textAlign: 'center'}}>
        <h2 style={styles.header}>로그인 / 회원가입</h2>

        <button onClick={handleSignIn} style={styles.googleButton}>
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google logo" style={styles.googleLogo} />
          Sign in with Google
        </button>
      </div>

    </div>
  );
};

// --- Styles --- (스타일 코드는 변경 없음)
const styles = {
  container: {
    height: '100%',
    width: '100%',
    backgroundColor: 'var(--color-main)', // 부드러운 크림색 배경
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'space-around', // 콘텐츠를 균등하게 배치
    padding: '40px',
    boxSizing: 'border-box'
  },
  header: {
    fontSize: '2.2rem',
    marginBottom: '8px',
    fontWeight: '700',
    color: 'var(--color-text-dark)',
  },
  googleButton: {
    padding: '12px 24px',
    fontSize: '1.3rem',
    fontWeight: 'bold',
    color: 'var(--color-text-dark)',
    fontFamily: 'var(--font-family-primary)',
    cursor: 'pointer',
    border: '1px solid #ccc',
    borderRadius: '30px',
    backgroundColor: 'white',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    transition: 'all 0.2s ease'
  },
  googleLogo: {
    width: '24px',
    height: '24px'
  }
};

export default Login;