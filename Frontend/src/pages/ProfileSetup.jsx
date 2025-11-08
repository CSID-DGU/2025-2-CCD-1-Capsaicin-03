// src/pages/ProfileSetup.jsx

import React, { useState, useEffect } from 'react'; 
import { useNavigate } from 'react-router-dom';
import { createChildProfile } from '../api/profileApi.js';
import { supabase } from '../supabaseClient'; 

const ProfileSetup = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkProfileExists = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          navigate('/login', { replace: true });
          return;
        }

        const { data, error } = await supabase
          .from('profiles') 
          .select('id')     
          .eq('id', user.id) 
          .single(); 

        if (error && error.code !== 'PGRST116') {
          // "행을 찾을 수 없음" 오류, 신규 유저
          // 그 외의 오류는 throw
          throw error;
        }

        if (data) {
          console.log('기존 프로필 확인. /stories로 이동합니다.');
          navigate('/stories', { replace: true });
        } else {
          console.log('신규 사용자. 프로필 설정을 시작합니다.');
          setIsChecking(false);
        }

      } catch (err) {
        console.error('프로필 확인 중 오류:', err);
        setError('프로필을 확인하는 중 오류가 발생했습니다.');
        setIsChecking(false);
      }
    };

    checkProfileExists();
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

    setIsLoading(true);
    setError(null);     

    try {
      const response = await createChildProfile({ name: name, birthYear: birthYear });

      console.log('API Response:', response);

      if (response.success) {
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

  return (
    <div style={styles.container}>
      <button onClick={handleBack} style={styles.backButton} disabled={isLoading}>
        {step === 1 ? 'X' : '〈'}
      </button>

      <div style={styles.content}>
        {step === 1 ? (
          <>
            <h3 style={styles.question}>아이의 이름은 무엇인가요?</h3>
            <input
              type="text"
              placeholder="이름"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={styles.inputField}
              disabled={isLoading} 
            />
            <button onClick={handleNext} style={styles.actionButton} disabled={isLoading}>
              다음으로
            </button>
          </>
        ) : (
          <>
            <h3 style={styles.question}>아이의 생년월일이 언제인가요?</h3>
            <div style={styles.dateInputWrapper}>
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
            <button onClick={handleCreateProfile} style={styles.actionButton} disabled={isLoading}>    
              {isLoading ? '생성 중...' : '만들기'}
            </button>
            
            {error && (
              <p style={{
                color: 'red', 
                marginTop: '15px', 
                fontSize: '0.9rem',
                backgroundColor: 'rgba(255, 255, 255, 0.5)',
                padding: '5px 10px',
                borderRadius: '10px'
              }}>
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

const topButtonBase = {
  position: 'absolute',
  top: '20px',
  fontSize: '1.5rem',
  cursor: 'pointer',
  background: 'var(--color-fourth)', 
  border: '3px solid var(--color-text-dark)', 
  borderRadius: '50%',
  width: '40px',
  height: '40px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'var(--color-text-dark)',
  fontWeight: 'bold',
  fontFamily: "var(--font-family-primary)"
};

const styles = {
  container: {
    height: '400px', 
    width: '100%',
    backgroundColor: 'var(--color-main)',
    display: 'flex',
    padding: '20px',
    boxSizing: 'border-box',
    position: 'relative', 
    fontFamily: "var(--font-family-primary)",
  },
  backButton: {
    ...topButtonBase,
    left: '30px',
  },
  content: {
    margin: 'auto',
    textAlign: 'center',
    width: '85%',
    maxWidth: '450px', 
    display: 'flex',
    flexDirection: 'column', 
    alignItems: 'center',   
  },
  question: {
    fontSize: '1.8rem',
    color: 'var(--color-text-dark)',
    marginBottom: '20px',
    fontFamily: "var(--font-family-primary)"
  },
  inputField: {
    padding: '12px',
    width: '100%',
    fontSize: '1.2rem',
    color: 'var(--color-text-dark)',
    borderRadius: '50px', 
    border: '2px solid var(--color-text-dark)',
    backgroundColor: '#FFFFFF',
    textAlign: 'center',
    boxSizing: 'border-box',
    outline: 'none',
    fontFamily: "var(--font-family-primary)",
  },
  dateInputWrapper: {
    position: 'relative',
    width: '100%',
  },
  actionButton: {
    padding: '10px 30px',
    fontSize: '1.2rem',
    cursor: 'pointer',
    backgroundColor: 'var(--color-fourth)',
    border: '2px solid var(--color-text-dark)', 
    borderRadius: '50px', 
    marginTop: '60px',
    color: 'var(--color-text-dark)',
    boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
    transition: 'transform 0.2s ease',
    fontFamily: "var(--font-family-primary)",
  }
};

export default ProfileSetup;