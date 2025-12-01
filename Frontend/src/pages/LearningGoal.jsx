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

      <div style={styles.contentWrapper}>
      <div style={styles.goalBox}>
        <span style={styles.goalTitle}>목표</span>
        <p style={styles.goalText}>{learningGoal}</p>
      </div>
      <button onClick={handleNext} style={styles.nextButton}>
        다음으로
      </button>
      </div>
    </div>
  );
}

// --- style ---
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
  
  // ✅ [수정] 홈 버튼 (반응형 위치 및 크기)
  homeButton: {
    position: 'absolute',
    top: '4%', // % 단위로 변경
    left: '4%',
    
    background: 'var(--color-fourth)', 
    border: 'clamp(2px, 0.5vw, 3px) solid var(--color-text-dark)',
    borderRadius: '50%',
    
    // 크기 반응형 (최소 35px ~ 최대 50px)
    width: 'clamp(30px, 8vw, 40px)',
    height: 'clamp(30px, 8vw, 40px)',
    
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
  
  // ✅ [추가] 콘텐츠 전체를 감싸는 래퍼 (중앙 정렬용)
  contentWrapper: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 'clamp(25px, 5vw, 40px)',
    width: '100%',
    maxWidth: '600px', // 너무 넓어지는 것 방지
  },
  
  goalBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 'clamp(7px, 4vw, 40px)',
    width: '100%', 
  },
  
  // ✅ [수정] "목표" 라벨 스타일
  goalTitle: {
    // 패딩과 폰트 크기 반응형
    padding: 'clamp(1px, 0.7vh, 6px) clamp(10px, 4vw, 25px)',
    fontSize: 'clamp(0.8rem, 2.5vw, 1.3rem)',
    
    fontFamily: 'var(--font-family-primary)',
    border: '3px solid var(--color-text-dark)',
    borderRadius: '30px', // 더 둥글게
    textAlign: 'center',
    backgroundColor: 'var(--color-main)',
    color: 'var(--color-text-dark)',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
  },
  
  // ✅ [수정] 학습 목표 텍스트
  goalText: {
    fontFamily: 'var(--font-family-primary)',
    color: 'var(--color-text-dark)',
    
    // 폰트 크기 반응형 (화면에 따라 적절히 조절됨)
    fontSize: 'clamp(0.9rem, 3.5vw, 1.4rem)', 
    
    lineHeight: '1.6',
    textAlign: 'center',
    maxWidth: '90%', // 좌우 여백 확보
    wordBreak: 'keep-all', // 단어 단위 줄바꿈
    whiteSpace: 'pre-line',
    margin: 0,
  },
  
  // ✅ [수정] "다음으로" 버튼
  nextButton: {
    // 패딩 반응형
    padding: 'clamp(3px, 1.4vh, 10px) clamp(20px, 5vw, 50px)',

    fontSize: 'clamp(0.9rem, 2.5vw, 1.3rem)',
    
    fontFamily: 'var(--font-family-primary)',
    border: '3px solid var(--color-text-dark)',
    borderRadius: '30px', 
    cursor: 'pointer',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    textAlign: 'center',
    backgroundColor: 'var(--color-third)', // 초록색 유지
    color: 'var(--color-text-dark)',
  }
};
  
export default LearningGoal;