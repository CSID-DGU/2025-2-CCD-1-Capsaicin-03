// src/pages/StoryPage.jsx

import { useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStory } from '../hooks/useStory.js';
import { useAudioPlayback } from '../hooks/useAudioPlayback.js';
import ReactGA from 'react-ga4';
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
  const hasSentStartEvent = useRef(false);

  useEffect(() => {
    if (!isLoading && storyData && !hasSentStartEvent.current) {
      ReactGA.event({
        category: "Story",
        action: "book_start",
        label: "동화 읽기 시작",
        story_id: storyId,
        total_pages: totalPages 
      });
      console.log(`[Analytics] book_start (total: ${totalPages})`);
      hasSentStartEvent.current = true;
    }
  }, [isLoading, storyData, totalPages, storyId]);

  useEffect(() => {
    if (!isLoading && storyData) {
      ReactGA.event({
        category: "Story",
        action: "book_read_page",
        label: `페이지 진입 (${page}쪽)`,
        story_id: storyId,
        page_number: page 
      });
      console.log(`[Analytics] book_read_page (page: ${page})`);
    }
  }, [page, isLoading, storyData, storyId]); // page가 변할 때마다 실행됨

  useEffect(() => {
    if (!isLoading && isLastPage) {
      ReactGA.event({
        category: "Story",
        action: "book_read_complete",
        label: "동화 읽기 완료",
        story_id: storyId
      });
      console.log("[Analytics] book_read_complete");
    }
  }, [isLastPage, isLoading, storyId]);

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
      <div style={{
          ...styles.textSection,
          paddingBottom: page === 0 ? '2%' : '13%' 
      }}>
        <div style={styles.pageInfo}>
            {page > 0 && (
              <span>페이지 {page}/{totalPages}</span>
            )}
        </div>
        <main style={page === 0 ? styles.coverContent : styles.storyContent}>
          <p style={page === 0 ? {} : styles.textContent}>
            {currentPageData.text_content}
          </p>
        </main>
        {isLastPage && (
            <div style={styles.actionContainer}>
              <button onClick={goToChatIntro} style={styles.chatButton}>
                대화하러 가기
              </button>
            </div>
          )}
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
    overflow: 'hidden', // 전체 스크롤 방지
    position: 'relative',
  },
  loadingError: { 
    justifyContent: 'center',
    alignItems: 'center',
    fontSize: 'clamp(1rem, 3vw, 1.5rem)',
    color: 'var(--color-text-dark)',
    display: 'flex',
    height: '100%',
    width: '100%'
  },
  
  // ✅ [수정] 왼쪽 이미지 영역 (화면의 50%)
  imageSection: {
    flex: 1, // 50% 차지
    height: '100%',
    backgroundColor: '#D6EAF8', 
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden'
  },
  storyImage: { 
    width: '100%',
    height: '100%',
    objectFit: 'cover' // 이미지가 꽉 차게
  },
  
  // ✅ [수정] 오른쪽 텍스트 영역 (화면의 50%)
  textSection: {
    flex: 1, // 50% 차지
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    padding: '2% 2% 13% 3%',
    boxSizing: 'border-box',
    position: 'relative',
  },
  
  // ✅ [수정] 홈 버튼 (반응형 크기 및 위치)
  homeButton: {
    position: 'absolute',
    top: '4%',
    left: '4%',
    background: 'var(--color-fourth)', 
    border: 'clamp(2px, 0.5vw, 3px) solid var(--color-text-dark)',
    borderRadius: '50%',
    
    // 크기 반응형
    width: 'clamp(30px, 8vw, 40px)',
    height: 'clamp(30px, 8vw, 40px)', 
    
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
  
  // ✅ [수정] 페이지 번호
  pageInfo: {
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: '10px',
    fontSize: 'clamp(0.8rem, 2vw, 1.1rem)', 
    color: 'var(--color-text-dark)',
    fontFamily: 'var(--font-family-primary)',
  },
  
  // ✅ [수정] 텍스트 내용 영역 (스크롤 가능)
  storyContent: {
    flexGrow: 1,
    overflowY: 'auto', // 내용 넘치면 스크롤
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center', // 텍스트 수직 중앙 정렬
    paddingTop: 'clamp(5px, 5vh, 20px)',
    paddingRight: 'clamp(5px, 5vh, 10px)',
  },
  textContent: {
    fontSize: 'clamp(0.8rem, 2.5vw, 1.0rem)', // 글자 크기 반응형
    lineHeight: '1.8',
    color: 'var(--color-text-dark)',
    whiteSpace: 'pre-line',
    wordBreak: 'keep-all',
    textAlign: 'center',
    margin: 0,
  },
  
  // ✅ [수정] 표지(0페이지) 스타일
  coverContent: {
    flexGrow: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center', 
    alignItems: 'center',    
    padding: '20px',
    textAlign: 'center',
    fontSize: 'clamp(1.8rem, 6vw, 3.5rem)',
    whiteSpace: 'pre-line',
    wordBreak: 'keep-all',
  },
  
  actionContainer: {
    textAlign: 'center',
    marginTop: '5%',
    flexShrink: 0,
  },
  
  // ✅ [수정] "대화하러 가기" 버튼
  chatButton: {
    padding: 'clamp(5px, 1.4vh, 15px) clamp(10px, 4vw, 40px)',
    fontSize: 'clamp(0.9rem, 3vw, 1.5rem)',
    fontFamily: 'var(--font-family-primary)',
    cursor: 'pointer',
    backgroundColor: 'var(--color-fourth)', 
    color: 'var(--color-text-dark)',
    border: '3px solid var(--color-text-dark)',
    borderRadius: '30px',
    boxShadow: '0 4px 15px rgba(255, 111, 97, 0.4)',
    whiteSpace: 'nowrap',
  },
  
  // ✅ [수정] 이전/다음 화살표 버튼
  navButton: { 
    position: 'absolute',
    bottom: '5%', // 바닥에서 5% 띄움
    
    // 크기 반응형
    width: 'clamp(30px, 8vw, 40px)', 
    height: 'clamp(30px, 8vw, 40px)', 
    
    borderRadius: '50%',
    backgroundColor: 'var(--color-fourth)',
    color: 'var(--color-text-dark)', 
    border: 'clamp(2px, 0.5vw, 3px) solid var(--color-text-dark)', 
    fontSize: 'clamp(1.2rem, 3vw, 1.5rem)', 
    fontWeight: 'bold', 
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    cursor: 'pointer',
    zIndex: 10,
    boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
  },
  prevButton: {
    left: '2%', // 오른쪽 섹션의 시작 부분 근처
  },
  nextButton: {
    right: '2%', // 오른쪽 끝에서 여백
  }
};

export default StoryPage;