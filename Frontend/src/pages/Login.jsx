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
        <span style={styles.header}>로그인 / 회원가입</span>

        <button onClick={handleSignIn} style={styles.googleButton}>
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google logo" style={styles.googleLogo} />
          Sign in with Google
        </button>

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
    justifyContent: 'center', 
    gap: '1vh',
    padding: '5%',
    boxSizing: 'border-box'
  },
  header: {
    fontSize: 'clamp(1.5rem, 5vw, 2.5rem)',
    marginBottom: '2vh',
    color: 'var(--color-text-dark)',
    fontFamily: 'var(--font-family-primary)',
    margin: 0,
    marginBottom: '3vh',
  },
  googleButton: {
    padding: 'clamp(8px, 1.2vh, 12px) clamp(20px, 4vw, 30px)',
    fontSize: 'clamp(1rem, 3.5vw, 1.4rem)',
    color: 'var(--color-text-dark)',
    fontFamily: 'var(--font-family-primary)',
    cursor: 'pointer',
    border: '1px solid #ccc',
    borderRadius: '50px',
    backgroundColor: 'white',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 'clamp(10px, 2vw, 15px)', 
    width: 'auto',      
    minWidth: '200px',
    maxWidth: '80%',
    whiteSpace: 'nowrap', 
  },
  googleLogo: {
    width: 'clamp(20px, 4vw, 26px)',
    height: 'auto'
  }
};

export default Login;