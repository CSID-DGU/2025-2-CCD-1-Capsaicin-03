import React, { useState, useEffect, useRef } from 'react'; // ✨ useRef import
import { useParams, useNavigate } from 'react-router-dom';

// 개발용 API 스위치 (나중에 API 연동 시 false로 변경)
const USE_MOCK_API = true;

// API 응답과 똑같이 생긴 Mock 데이터 생성
const mockApiResponse = {
  "success": true,
  "message": "요청이 성공적으로 처리되었습니다. (Mock Data)",
  "data": {
    "id": 1,
    "title": "콩쥐 팥쥐",
    "total_pages": 3,
    "pages": [
      {
        "page_number": 1,
        "text_content": "옛날 옛적, 마음씨 고약한 팥쥐와~... (1페이지 Mock)",
        "image_url": "/test_image.png",
        "audio_url": "/iteach4u_53980_삼년 고개.mp3"
      },
      {
        "page_number": 2,
        "text_content": "팥쥐는 콩쥐를 구박했어요~... (2페이지 Mock)",
        "image_url": "/test_image.png",
        "audio_url": "/iteach4u_53980_삼년 고개.mp3"
      },
      {
        "page_number": 3,
        "text_content": "하지만 콩쥐는 착한 마음씨로~... (3페이지 Mock)",
        "image_url": "https://cdn.example.com/images/book-001/page_3.jpg",
        "audio_url": "https://cdn.example.com/audio/book-001/page_3.mp3"
      }
    ]
  }
};


const StoryPage = () => {
  const { storyId } = useParams();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [storyData, setStoryData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const audioRef = useRef(new Audio());
  
  useEffect(() => {
    const fetchStory = async () => {
      setIsLoading(true);
      setError(null);
      setStoryData(null);
      setPage(1);
      
      try {
        const response = await fetch(`/api/stories/${storyId}`);
        if (!response.ok) {
          throw new Error('동화를 불러오는데 실패했습니다.');
        }
        const result = await response.json();
        
        if (result.success) {
          setStoryData(result.data);
        } else {
          throw new Error(result.message || '동화 데이터를 찾을 수 없습니다.');
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    const fetchMockStory = () => {
      setIsLoading(true);
      setError(null);
      setStoryData(null);
      setPage(1);

      // 실제 API처럼 약간의 딜레이(0.5초)를 줌
      setTimeout(() => {
        if (mockApiResponse.success) {
          setStoryData(mockApiResponse.data);
        } else {
          setError(mockApiResponse.message);
        }
        setIsLoading(false);
      }, 500);
    };


    // 스위치(USE_MOCK_API) 값에 따라 분기 처리
    if (USE_MOCK_API) {
      fetchMockStory(); 
    } else {
      fetchStory(); 
    }

    // 스토리가 바뀌거나 컴포넌트가 사라질 때 오디오 정리
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, [storyId]); // storyId가 바뀔 때마다 다시 호출

  // 오디오 자동재생을 위한 useEffect
  useEffect(() => {
    if (!storyData || !audioRef.current) return; 

    // 페이지 넘길 때 일단 정지
    audioRef.current.pause();
    audioRef.current.currentTime = 0;

    const currentAudioUrl = storyData.pages[page - 1]?.audio_url;

    if (currentAudioUrl) {
      audioRef.current.src = currentAudioUrl; // 새 오디오 소스
      audioRef.current.volume = 1.0; 
      
      // 자동재생 시도
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.warn("오디오 자동재생이 차단되었습니다:", error);
        });
      }
    } else {
      audioRef.current.src = ''; // 이 페이지에 오디오 없으면 비움
    }
    
  }, [page, storyData]); // page나 storyData가 바뀔 때마다 실행


  //로딩 및 에러 처리
  if (isLoading) {
    return <div style={{...styles.container, ...styles.loadingError}}>로딩 중...</div>;
  }
  if (error) {
    return <div style={{...styles.container, ...styles.loadingError}}>오류: {error}</div>;
  }
  if (!storyData) {
    return <div style={{...styles.container, ...styles.loadingError}}>존재하지 않는 동화입니다.</div>;
  }

  const totalPages = storyData.total_pages; 
  const isLastPage = page === totalPages;
  const currentPageData = storyData.pages[page - 1]; 

  const goToNextPage = () => {
    if (page < totalPages) setPage(prev => prev + 1);
  };
  const goToPrevPage = () => {
    if (page > 1) setPage(prev => prev - 1);
  };
  const goToChatIntro = () => {
    navigate(`/chat/${storyId}/intro`);
  };
  
  // currentPageData가 없는 경우(로딩 중 예외처리)
  if (!currentPageData) {
    return <div style={{...styles.container, ...styles.loadingError}}>페이지 로딩 중...</div>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.imageSection}>
        <img 
          src={currentPageData.image_url} 
          alt={`${storyData.title} - ${page}페이지`}
          style={styles.storyImage} 
        />
        <button onClick={() => navigate('/stories')} style={styles.homeButton}>
          <img src="/home_icon.svg" style={styles.homeIcon} />
        </button>
      </div>
      <div style={styles.textSection}>
        <header style={styles.header}>
          <div style={styles.pageInfo}>
            <span>페이지 {page}/{totalPages}</span>
          </div>
        </header>
        <main style={styles.storyContent}>
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
      {page > 1 && (
        <button onClick={goToPrevPage} style={{ ...styles.navButton, ...styles.prevButton }}>&lt;</button>
      )}
      {!isLastPage && (
        <button onClick={goToNextPage} style={{ ...styles.navButton, ...styles.nextButton }}>&gt;</button>
      )}
    </div>
  );
};

// --- Styles ---
const styles = {
    container: {
        display: 'flex',
        height: '100%',
        width: '100%',
        backgroundColor: '#fff',
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
        margin: '15px',
        borderRadius: '15px',
        position: 'relative',
    },
    storyImage: { 
        width: '100%',
        height: '100%',
        objectFit: 'contain', 
        borderRadius: '15px'
    },
    textSection: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        padding: '15px',
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
        left: '5px',
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
        gap: '15px',
        fontSize: '1.0rem', 
        color: 'var(--color-text-dark)'
    },
    storyContent: {
        flexGrow: 1,
        overflowY: 'auto',
        padding: '20px',
        fontSize: '1.3rem', 
        lineHeight: '1.8',
        color: 'var(--color-text-dark)'
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
        left: '20px',
    },
    nextButton: {
        right: '20px',
    }
};

export default StoryPage;