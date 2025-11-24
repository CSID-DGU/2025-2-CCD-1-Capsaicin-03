// src/pages/Login.jsx

import { useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import ReactGA from 'react-ga4';

const Login = () => {

  const isLoginProcessStarted = useRef(false);

  useEffect(() => {
    ReactGA.event({
      category: "Authentication",
      action: "login_screen_view",
      label: "로그인 화면 진입"
    });

    console.log("[Analytics] login_screen_view 전송됨");

    return () => {
      if (!isLoginProcessStarted.current) {
        ReactGA.event({
          category: "Authentication",
          action: "login_exit",
          label: "로그인 하지 않고 이탈"
        });
        console.log("[Analytics] login_exit 전송됨 (이탈)");
      }
    };
  }, []);
  
  const handleSignIn = async () => {
    console.log('구글 로그인 버튼 클릭됨. Supabase 인증을 시작합니다.');
    
    isLoginProcessStarted.current = true;
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    });

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

// --- Styles --- 
const styles = {
  container: {
    height: '100%',
    width: '100%',
    backgroundColor: 'var(--color-main)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'space-around', 
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