// src/pages/StoryPage.jsx

import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useStory } from '../hooks/useStory.js';
import { useAudioPlayback } from '../hooks/useAudioPlayback.js';
import { saveLastReadPage, saveLastReadPageOnExit } from '../api/storyApi.js';
import { getChildProfile } from '../api/profileApi.js'; 
import ReactGA from 'react-ga4';
import homeIcon from '../assets/home_icon.svg';
import CustomModal from '../components/CustomModal';

const StoryPage = () => {
  const { storyId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const initialPage = location.state?.initialPage || 0;
  
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
  } = useStory(storyId, initialPage);

  const hasSentStartEvent = useRef(false);
  const scrollContainerRef = useRef(null);
  const [isExitModalOpen, setIsExitModalOpen] = useState(false);
  const [childId, setChildId] = useState(null);
  const pageRef = useRef(page);
  const childIdRef = useRef(childId);
  const isCompleting = useRef(false);

  useEffect(() => {
    pageRef.current = page;
  }, [page]);

  useEffect(() => {
    childIdRef.current = childId;
  }, [childId]);

  useEffect(() => {
     const fetchChildId = async () => {
         try {
             const profile = await getChildProfile();
             const extractedId = profile?.data?.id;

             if (extractedId) {
                setChildId(extractedId);
             } else {
                console.warn("[DEBUG_PAGE] 프로필 데이터에서 'id'를 찾을 수 없습니다:", profile);
             }
         } catch (e) {
             console.error("[DEBUG_PAGE] Child ID fetch error", e);
         }
     };
     fetchChildId();
  }, []);

  const saveProgress = async (isEnd = false) => {
    if (!childId || !storyId) return;
    const currentPage = pageRef.current;

    if (currentPage === 0) {
        return;
    }

    try {
        console.log(`[DEBUG_PAGE] 저장 시도 - 페이지: ${currentPage}, 완독여부: ${isEnd}`);
        await saveLastReadPage(storyId, childId, currentPage, isEnd); 
        
    } catch (e) {
        console.error("[DEBUG_PAGE] 🚨 저장 API 실패:", e);
    }
  };

  useEffect(() => {
    const handleExitLogic = (situation) => {
      if (isCompleting.current) {
          console.log(`[Exit] ${situation} 감지됨. 하지만 완독 요청 중이므로 저장 건너뜀.`);
          return;
      }

      const currentChildId = childIdRef.current;
      const currentPage = pageRef.current;

      if (currentChildId && currentPage > 0) {
          console.log(`[Exit] ${situation} 감지 -> keepalive 저장: ${currentPage}p (childId: ${currentChildId})`);
          saveLastReadPageOnExit(storyId, currentChildId, currentPage, false);
      }
    };
  
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        const currentPage = pageRef.current;
        if (currentPage > 0 && childId) {
            console.log(`[Exit] 앱 숨김 -> keepalive 저장: ${currentPage}p`);
            saveLastReadPageOnExit(storyId, childId, currentPage, false);
        }
      }
    };

    const handleBeforeUnload = () => {
        handleExitLogic("브라우저 닫기");
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('beforeunload', handleBeforeUnload);
        handleExitLogic("컴포넌트 언마운트(뒤로가기)");
    };
  }, [storyId]);

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
  }, [page, isLoading, storyData, storyId]);

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

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [page]);

  const handleHomeClick = () => {
    setIsExitModalOpen(true);
  };

  const handleExitConfirm = async () => {
    await saveProgress(false);
    setIsExitModalOpen(false);
    navigate('/stories'); 
  };

  const handleExitCancel = () => {
    setIsExitModalOpen(false);
  };

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

  const goToChatIntro = async () => {
    if (childId && storyId && storyData) {
      try {
            isCompleting.current = true;
            const finalPageNumber = storyData.total_pages;

            console.log(`[DEBUG_PAGE] 대화하러 가기 클릭!`);
            console.log(`- 전송할 페이지 번호(total_pages): ${finalPageNumber}`);
            
            await saveLastReadPage(storyId, childId, finalPageNumber, true); 
            
          } catch (e) {
              console.error("[DEBUG_PAGE] 마지막 페이지 저장 실패:", e);
          }
    }
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
        <button onClick={handleHomeClick} style={styles.homeButton}>
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
        <main
          ref={scrollContainerRef}
          style={page === 0 ? styles.coverContent : styles.storyContent}
        >
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
      <CustomModal
        isOpen={isExitModalOpen}
        message="동화 읽기를 멈추시겠어요?"
        onConfirm={handleExitConfirm}
        onCancel={handleExitCancel}
        showCancel={true}
        cancelText="취소"  
        confirmText="확인"
      />
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
    overflow: 'hidden',
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
  imageSection: {
    flex: 1,
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
    objectFit: 'cover'
  },
  textSection: {
    flex: 1,
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    padding: '2% 2% 13% 3%',
    boxSizing: 'border-box',
    position: 'relative',
  },

  homeButton: {
    position: 'absolute',
    top: '4%',
    left: '4%',
    background: 'var(--color-fourth)',
    border: 'clamp(2px, 0.5vw, 3px) solid var(--color-text-dark)',
    borderRadius: '50%',
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
 
  pageInfo: {
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: '10px',
    fontSize: 'clamp(0.8rem, 2vw, 1.1rem)',
    color: 'var(--color-text-dark)',
    fontFamily: 'var(--font-family-primary)',
  },

  storyContent: {
    flexGrow: 1,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    paddingTop: 'clamp(5px, 5vh, 20px)',
    paddingRight: 'clamp(5px, 5vh, 10px)',
  },
  textContent: {
    fontSize: 'clamp(0.8rem, 2.5vw, 1.0rem)',
    lineHeight: '1.8',
    color: 'var(--color-text-dark)',
    whiteSpace: 'pre-line',
    wordBreak: 'keep-all',
    textAlign: 'center',
    marginTop: 'auto',
    marginBottom: 'auto',
  },
 
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

  navButton: {
    position: 'absolute',
    bottom: '5%',
    width: 'clamp(30px, 8vw, 40px)',
    height: 'auto',
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
    boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
    aspectRatio: '1/1',
    flexShrink: 0,
  },
  prevButton: {
    left: '2%',
  },
  nextButton: {
    right: '2%',
  }
};

export default StoryPage;