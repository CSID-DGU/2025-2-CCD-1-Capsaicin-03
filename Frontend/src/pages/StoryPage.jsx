// src/pages/StoryPage.jsx
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStory } from '../hooks/useStory.js';
import { useAudioPlayback } from '../hooks/useAudioPlayback.js';
import homeIcon from '../assets/home_icon.svg';

const StoryPage = () => {
  const { storyId } = useParams();
  const navigate = useNavigate();
  const {
    isLoading,
    error,
    storyData,
    currentPageData,
    page, 
    totalPages,
    isLastPage,
    goToNextPage,
    goToPrevPage
  } = useStory(storyId);

  useAudioPlayback(
    currentPageData?.audio_url, 
    !isLoading && !error,       
    page                       
  );
  
  // (로딩 및 에러 처리)
  if (isLoading) {
    return <div style={{...styles.container, ...styles.loadingError}}>로딩 중...</div>;
  }
  if (error) {
    return <div style={{...styles.container, ...styles.loadingError}}>오류: {error}</div>;
  }
  if (!storyData || !currentPageData) {
    return <div style={{...styles.container, ...styles.loadingError}}>동화 데이터를 불러오는 중...</div>;
  }

  const goToChatIntro = () => {
    navigate(`/chat/${storyId}/goal`);
  };

  const getPageIndicator = () => {
    if (page === 0) {
        return "커버 페이지"; // 0페이지일 때
    }
    // 1페이지 이상일 때 "페이지 1/21"
    return `페이지 ${page}/${totalPages}`; 
  };

  return (
    <div style={styles.container}>
      <div style={styles.imageSection}>
        <img 
          src={currentPageData.image_url} 
          alt={`${storyData.title} - ${page}페이지`}
          style={styles.storyImage} 
        />
        <button onClick={() => navigate('/stories')} style={styles.homeButton}>
          <img src={homeIcon} style={styles.homeIcon} />
        </button>
      </div>
      <div style={styles.textSection}>
        <header style={styles.header}>
          <div style={styles.pageInfo}>
            {page > 0 && (
              <span>페이지 {page}/{totalPages}</span>
            )}
          </div>
        </header>
        <main style={page === 0 ? styles.coverContent : styles.storyContent}>
          <p>{currentPageData.text_content}</p>
          {isLastPage && (
            <div style={styles.actionContainer}>
              <button onClick={goToChatIntro} style={styles.chatButton}>
                대화하러 가기
              </button>
            </div>
          )}
        </main>
      </div>
      {page > 0 && (
        <button onClick={goToPrevPage} style={{ ...styles.navButton, ...styles.prevButton }}>&lt;</button>
      )}
      {!isLastPage && (
        <button onClick={goToNextPage} style={{ ...styles.navButton, ...styles.nextButton }}>&gt;</button>
      )}
    </div>
  );
};

// --- Styles (동일) ---
const styles = {
    container: {
        display: 'flex',
        height: '100%',
        width: '100%',
        backgroundColor: 'var(--color-main)',
    },
    loadingError: { 
        justifyContent: 'center',
        alignItems: 'center',
        fontSize: '1.5rem',
        color: 'var(--color-text-dark)' 
    },
    imageSection: {
        flex: 1,
        backgroundColor: '#D6EAF8', 
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        margin: '0',
        position: 'relative',
        overflow: 'hidden'
    },
    storyImage: { 
        width: '100%',
        height: '100%',
        objectFit: 'cover'
    },
    textSection: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        padding: '10px 20px',
        boxSizing: 'border-box'
    },
    header: {
        display: 'flex',
        justifyContent: 'flex-end', 
        alignItems: 'center',
        padding: '10px',
    },
    homeButton: {
        position: 'absolute',
        top: '10px',
        left: '10px',
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
        boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
    },
    homeIcon: {
        width: '60%',
        height: '60%',
        objectFit: 'contain',
    },
    pageInfo: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        fontSize: '1.0rem', 
        color: 'var(--color-text-dark)'
    },
    storyContent: {
        flexGrow: 1,
        overflowY: 'auto',
        fontSize: '1.0rem',
        lineHeight: '1.7',
        color: 'var(--color-text-dark)',
        whiteSpace: 'pre-line',
        wordBreak: 'keep-all'
    },
    coverContent: {
        flexGrow: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center',    
        padding: '20px',
        fontSize: '2.7rem',
        color: 'var(--color-text-dark)',
    },
    actionContainer: {
        textAlign: 'center',
        marginTop: '40px',
    },
    chatButton: {
        padding: '15px 40px',
        fontSize: '1.4rem',
        fontFamily: 'var(--font-family-primary)',
        cursor: 'pointer',
        backgroundColor: 'var(--color-fourth)', 
        color: 'var(--color-text-dark)',
        border: '3px solid var(--color-text-dark)',
        borderRadius: '30px',
        boxShadow: '0 4px 15px rgba(255, 111, 97, 0.4)'
    },
    navButton: { 
        position: 'absolute',
        bottom: '20px', 
        width: '40px', 
        height: '40px', 
        borderRadius: '50%',
        backgroundColor: 'var(--color-fourth)',
        color: 'var(--color-text-dark)', 
        border: '3px solid var(--color-text-dark)', 
        fontSize: '1.5rem', 
        fontWeight: 'bold', 
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        cursor: 'pointer',
        zIndex: 10,
        transition: 'background-color 0.2s ease',
        boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
    },
    prevButton: {
        left: '10px',
    },
    nextButton: {
        right: '10px',
    }
};

export default StoryPage;