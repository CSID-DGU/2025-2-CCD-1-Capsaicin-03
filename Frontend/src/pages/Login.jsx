// src/pages/Login.jsx

import { supabase } from '../supabaseClient';
const Login = () => {
  const handleSignIn = async () => {
    console.log('구글 로그인 버튼 클릭됨. Supabase 인증을 시작합니다.');

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        // 기본 도메인으로 리디렉션 수정(자동 리디렉션 처리를 위해)
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