// src/pages/LearningGoal.jsx

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getLearningGoal } from '../api/chatApi'; 
import homeIcon from '../assets/home_icon.svg';

function LearningGoal() {
  const { storyId } = useParams();
  const navigate = useNavigate();
  const [learningGoal, setLearningGoal] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchGoal = async () => {
      setIsLoading(true);
      
      const { data, error } = await getLearningGoal(storyId);

      if (error) {
        console.error('Error fetching learning goal:', error);
      } else if (data && data.learning_goal) {
        setLearningGoal(data.learning_goal);
      } else {
        console.warn('학습 목표 데이터가 없습니다.');
      }
      setIsLoading(false);
    };

    fetchGoal();
  }, [storyId]);

  const handleNext = () => {
    navigate(`/chat/${storyId}/intro`);
  };

  const handleHome = () => {
      navigate('/stories'); // 메인 페이지로
  };

  if (isLoading) {
    return <div>로딩 중...</div>;
  }

  return (
    <div style={styles.container}>
      <button onClick={handleHome} style={styles.homeButton}>
        <img src={homeIcon} alt="홈으로" style={styles.homeIcon} />
      </button>


      <div style={styles.goalBox}>
        <span style={styles.goalTitle}>목표</span>
        <p style={styles.goalText}>{learningGoal}</p>
      </div>
      <button onClick={handleNext} style={styles.nextButton}>
        다음으로
      </button>
    </div>
  );
}

const styles = {
    container: {
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100%', 
      width: '100%',
      boxSizing: 'border-box',
      overflow: 'hidden',
      position: 'relative', 
      fontFamily: 'var(--font-family-primary)',
      backgroundColor: 'var(--color-main)',
      padding: '20px',
    },
    homeButton: {
      position: 'absolute',
      top: '20px',
      left: '15px',
      background: 'var(--color-fourth)', 
      border: '3px solid var(--color-text-dark)',
      borderRadius: '50%',
      width: '40px',
      height: '40px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      zIndex: 100,
      padding: 0,
      boxShadow: '0 4px 10px rgba(0,0,0,0.1)', 
    },
    homeIcon: {
      width: '60%',
      height: '60%',
      objectFit: 'contain',
    },
    goalBox: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '15px', 
      marginBottom: '30px', 
      width: '100%', 
    },
    goalTitle: {
      padding: '8px 25px', 
      fontSize: '1.1rem',
      fontFamily: 'var(--font-family-primary)',
      border: '3px solid var(--color-text-dark)',
      borderRadius: '25px', 
      textAlign: 'center',
      backgroundColor: 'var(--color-main)',
      color: 'var(--color-text-dark)',
      boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    },
    goalText: {
      fontFamily: 'var(--font-family-primary)',
      color: 'var(--color-text-dark)',
      fontSize: '1.3rem', 
      lineHeight: '1.6',
      textAlign: 'center',
      maxWidth: '80%',
      wordBreak: 'keep-all'
    },
    nextButton: {
      padding: '11px 35px', 
      fontSize: '1.1rem',
      fontFamily: 'var(--font-family-primary)',
      border: '3px solid var(--color-text-dark)',
      borderRadius: '25px', 
      cursor: 'pointer',
      boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
      textAlign: 'center',
      backgroundColor: 'var(--color-third)',
      color: 'var(--color-text-dark)',
    }
  };
  
export default LearningGoal;