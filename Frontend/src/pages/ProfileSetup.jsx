// src/pages/ProfileSetup.jsx

import { useState, useEffect, useRef } from 'react'; 
import { useNavigate } from 'react-router-dom';
import { createChildProfile } from '../api/profileApi.js';
import { supabase } from '../supabaseClient'; 
import ReactGA from 'react-ga4';

const ProfileSetup = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isChecking, setIsChecking] = useState(true);
  const [isPrivacyAgreed, setIsPrivacyAgreed] = useState(false);
  const [isTermsAgreed, setIsTermsAgreed] = useState(false);
  const startTime = useRef(Date.now());

  useEffect(() => {
    ReactGA.event({
      category: "Profile",
      action: "profile_screen_enter",
      label: "프로필 생성 화면 진입"
    });
    console.log("[Analytics] profile_screen_enter");

    return () => {
      const endTime = Date.now();
      const duration = endTime - startTime.current; // 머문 시간(ms) 계산

      ReactGA.event({
        category: "Profile",
        action: "profile_screen_exit",
        label: "프로필 생성 화면 이탈",
        duration: duration 
      });
      console.log(`[Analytics] profile_screen_exit (체류시간: ${duration}ms)`);
    };
  }, []);

  useEffect(() => {
    if (isChecking) return;

    ReactGA.event({
      category: "Profile",
      action: `profile_step_${step}_view`, // step 변수에 따라 1_view, 2_view 자동 전송
      label: `${step}단계 진입`
    });
    console.log(`[Analytics] profile_step_${step}_view`);
  }, [step, isChecking]);
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          navigate('/login', { replace: true });
          return;
        }

        
        console.log('로그인 확인됨. 프로필 설정을 시작합니다.');
        setIsChecking(false);

      } catch (err) {
        console.error('프로필 확인 중 오류:', err);
        setError('프로필을 확인하는 중 오류가 발생했습니다.');
        setIsChecking(false);
      }
    };

    checkAuth();
  }, [navigate]);


  const handleNext = () => {
    if (name.trim()) setStep(2);
    else alert('아이의 이름을 입력해주세요.');
  };

    const handleCreateProfile = async () => {
    //유효성 검사: 4자리 숫자인지 확인
    const yearPattern = /^\d{4}$/;
    if (!birthYear || !yearPattern.test(birthYear)) { 
      alert('태어난 해 4자리(YYYY)를 정확히 입력해주세요.');
      return; 
      }
      
    if (!isPrivacyAgreed) {
      alert('⚠️ 개인정보 처리 방침에 동의해주세요.');
      return;
    }

    if (!isTermsAgreed) {
      alert('⚠️ 서비스 이용약관에 동의해주세요.');
      return;
    }

    setIsLoading(true);
    setError(null);     

    try {
      const response = await createChildProfile({ name: name, birthYear: birthYear });

      console.log('API Response:', response);

      if (response.success) {
        ReactGA.event({
          category: "Profile",
          action: "profile_create_success",
          label: "프로필 생성 완료"
        });
        console.log("[Analytics] profile_create_success");

        navigate('/stories');
      } else {
        const errorMessage = response.message || '프로필 생성에 실패했습니다.';
        setError(errorMessage);
        alert(errorMessage);
      }

    } catch (err) {
      console.error('Profile creation failed:', err);
      const errorMessage = err.response?.data?.message || '프로필 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
      setError(errorMessage);
      alert(errorMessage);
    } finally {
      setIsLoading(false); 
    }
  };

  const handleBack = () => {
    if (step === 2) {
      setStep(1);
    } else {
      navigate('/'); 
    }
  };
  
    const handleYearChange = (e) => {
    const value = e.target.value.replace(/\D/g, '');
    setBirthYear(value.slice(0, 4));
  };

  if (isChecking) {
    return (
      <div style={{...styles.container, ...styles.content, fontSize: '1.5rem'}}>
        프로필 정보를 확인하는 중...
      </div>
    );
  }

  const isFormValid = birthYear.length === 4 && isPrivacyAgreed && isTermsAgreed;

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <button onClick={handleBack} style={styles.backButton} disabled={isLoading}>
          {step === 1 ? 'X' : '〈'}
        </button>
      </header>

      <div style={{
          ...styles.content, 
          ...(step === 1 ? styles.step1Specific : styles.step2Specific)
      }}>
        {step === 1 ? (
          <>
            <div style={styles.inputGroup}>
                <span style={styles.question}>아이의 이름은 무엇인가요?</span>
                <input
                    type="text"
                    placeholder="이름"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    style={styles.inputField}
                    disabled={isLoading} 
                />
            </div>
            
            <button onClick={handleNext} style={styles.actionButton} disabled={isLoading}>
              다음으로
            </button>
          </>
        ) : (
          <>
            <div style={styles.inputGroup}>
                <span style={styles.question}>아이의 생년이 언제인가요?</span>
                <input
                    type="tel"
                    placeholder="태어난 해 (YYYY)"
                    value={birthYear}
                    onChange={handleYearChange}
                    style={styles.inputField}
                    maxLength={4} 
                    disabled={isLoading} 
                />
            </div>

            <div style={styles.consentGroup}>
                <div style={styles.consentItem}>
                    <input
                        type="checkbox"
                        id="terms_agree"
                        checked={isTermsAgreed}
                        onChange={(e) => setIsTermsAgreed(e.target.checked)}
                        disabled={isLoading}
                        style={styles.checkbox}
                    />
                    <label htmlFor="terms_agree" style={styles.checkboxLabel}>
                        <a 
                            href="https://www.notion.so/2a6fbd7a5e8d80b1beb5ec51d3b7bfa8?source=copy_link"
                            target="_blank"
                            rel="noopener noreferrer"
                            style={styles.privacyLink}
                        >
                            서비스 이용약관
                        </a>
                        에 동의합니다. (필수)
                    </label>
                </div>
                
                <div style={styles.consentItem}>
                    <input
                        type="checkbox"
                        id="privacy_agree"
                        checked={isPrivacyAgreed}
                        onChange={(e) => setIsPrivacyAgreed(e.target.checked)}
                        disabled={isLoading}
                        style={styles.checkbox}
                    />
                    <label htmlFor="privacy_agree" style={styles.checkboxLabel}>
                        <a 
                            href="https://www.notion.so/2a6fbd7a5e8d80ed8ea5ea655423c4ee?source=copy_link" 
                            target="_blank"
                            rel="noopener noreferrer"
                            style={styles.privacyLink}
                        >
                            개인정보 처리 방침
                        </a>
                        에 동의합니다. (필수)
                    </label>
                </div>
            </div>
            
            <button 
                onClick={handleCreateProfile} 
                style={{
                    ...styles.actionButton,
                    backgroundColor: isFormValid ? 'var(--color-fourth)' : 'var("#565555ff")',
                    color: isFormValid ? 'var(--color-text-dark)' : 'var("#565555ff")',
                    cursor: isFormValid ? 'pointer' : 'not-allowed'
                }}
                disabled={isLoading || !isFormValid}
            >     
                {isLoading ? '생성 중...' : '만들기'}
            </button>
            
            {error && (
                <p style={styles.errorMessage}>
                    {error}
                </p>
            )}
          </>
        )}
      </div>
    </div>
  );
};

// --- Styles ---
const styles = {
  container: {
    minHeight: '100%',
    height: '100%',
    width: '100%',
    backgroundColor: 'var(--color-main)',
    display: 'flex',
    flexDirection: 'column',
    boxSizing: 'border-box',
    position: 'relative', 
    fontFamily: "var(--font-family-primary)",
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  header: {
    width: '100%',
    height: '20%', // 반응형 헤더 높이
    display: 'flex',
    alignItems: 'center', // 세로 중앙 정렬
    paddingLeft: 'clamp(20px, 5vw, 30px)', // 왼쪽 여백
    boxSizing: 'border-box',
    flexShrink: 0, // 컨텐츠가 많아져도 헤더가 찌그러지지 않게 함
  },
  backButton: {
    position: 'absolute',
    top: '5%',
    left: '3%',
    fontSize: 'clamp(1.2rem, 4vw, 1.5rem)',
    cursor: 'pointer',
    background: 'var(--color-fourth)', 
    border: 'clamp(2px, 0.5vw, 3px) solid var(--color-text-dark)', 
    borderRadius: '50%',
    width: 'clamp(30px, 8vw, 40px)',
    height: 'clamp(30px, 8vw, 40px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--color-text-dark)',
    fontWeight: 'bold',
    fontFamily: "var(--font-family-primary)",
    boxShadow: '0 4px 6px rgba(0,0,0,0.15)',
    flexShrink: 0,
  },
  content: {
    textAlign: 'center',
    width: '100%',
    maxWidth: 'min(85%, 500px)',
    display: 'flex',
    flexDirection: 'column', 
    alignItems: 'center',
    justifyContent: 'center',
  },
  step1Specific: {
    justifyContent: 'center', // 이름 입력은 화면 중앙 정렬
    height: '60%',            // 높이 비율 설정
    gap:'4%'
  },
  step2Specific: {
    justifyContent: 'center', // 이름 입력은 화면 중앙 정렬
    height: '60%',            // 높이 비율 설정
    gap:'1%'
  },

  question: {
    fontSize: 'clamp(1.0rem, 4vw, 2rem)',
    color: 'var(--color-text-dark)',
    margin: 0,
    fontFamily: "var(--font-family-primary)",
  },
  inputField: {
    padding: 'clamp(5px, 3vh, 20px) clamp(15px, 4vw, 25px)',
    height: 'clamp(20px, 8vh, 60px)',
    maxHeight:'32%',
    width: '100%',
    fontSize: 'clamp(1rem, 3.5vw, 1.2rem)',
    color: 'var(--color-text-dark)',
    borderRadius: 'clamp(25px, 6vh, 50px)', 
    border: 'clamp(2px, 0.4vw, 3px) solid var(--color-text-dark)',
    backgroundColor: '#FFFFFF',
    textAlign: 'center',
    boxSizing: 'border-box',
    outline: 'none',
    fontFamily: "var(--font-family-primary)",
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    marginTop:'2%'
  },
  dateInputWrapper: {
    position: 'relative',
    width: '100%',
  },
  actionButton: {
    padding: 'clamp(10px, 1.5vh, 25px) clamp(25px, 6vw, 40px)',
    maxHeight: '30%',
    minWidth: 'clamp(100px, 25vw, 160px)',
    fontSize: 'clamp(1rem, 3.5vw, 1.3rem)',
    cursor: 'pointer',
    backgroundColor: 'var(--color-fourth)',
    border: 'clamp(2px, 0.4vw, 3px) solid var(--color-text-dark)', 
    borderRadius: 'clamp(25px, 6vh, 50px)', 
    color: 'var(--color-text-dark)',
    boxShadow: '0 4px 10px rgba(0,0,0,0.15)',
    transition: 'transform 0.2s ease, background-color 0.3s ease',
    fontFamily: "var(--font-family-primary)",
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  consentGroup: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    width: '100%',
    maxWidth: '60%',
  },
  consentItem: {
    display: 'flex',
    alignItems: 'center',
    fontSize: 'clamp(0.5rem, 2.5vw, 0.9rem)',
    color: 'var(--color-text-dark)',
    width: '100%',
    justifyContent: 'center',
  },
  checkbox: {
    width: 'clamp(10px, 3vw, 17px)',
    height: 'clamp(10px, 3vw, 17px)',
    cursor: 'pointer',
    flexShrink: 0,
  },
  checkboxLabel: {
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    lineHeight: 1.3,
  },
  privacyLink: {
    color: 'var(--color-text-dark)',
    textDecoration: 'underline',
    fontWeight: 'bold',
  },
  errorMessage: {
    color: 'red', 
    marginTop: '15px', 
    fontSize: 'clamp(0.8rem, 2.5vw, 0.95rem)',
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    padding: '5px 10px',
    borderRadius: '10px'
  }
};


export default ProfileSetup;