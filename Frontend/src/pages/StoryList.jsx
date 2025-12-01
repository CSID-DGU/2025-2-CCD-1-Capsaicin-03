// src/pages/StoryList.jsx

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchStoriesByCategory } from '../api/storyApi.js';
import ReactGA from 'react-ga4';

const categories = [
  { code: 'SA', name: '내 마음 살펴보기' },
  { code: 'SM', name: '마음 차분히 다루기' },
  { code: 'SOA', name: '다른 마음 이해하기' },
  { code: 'RS', name: '함께 이야기하고 듣기' },
  { code: 'RDM', name: '생각하고 바르게 선택하기' }
];

//GA를 위한 파라미터 변환용 맵
const CASEL_MAP = {
  'SA': 'self_awareness',
  'SM': 'self_management',
  'SOA': 'social_awareness',
  'RS': 'relationship_skills',
  'RDM': 'responsible_decision_making'
};

const StoryList = () => {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState(categories[0].code);
  const [stories, setStories] = useState([]);
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null);

  const handleGoToParentsPage = () => {
    navigate('/parents'); 
  }
  
  useEffect(() => {
    ReactGA.event({
      category: "Story",
      action: "book_list_view",
      label: "동화 목록 화면 진입"
    });
    console.log("[Analytics] book_list_view");
  }, []);

  useEffect(() => {
    const loadStories = async () => {
      setIsLoading(true); 
      setError(null);     
      setStories([]);     

      try {
        const data = await fetchStoriesByCategory(activeCategory);
        setStories(data.stories); 
      } catch (err) {
        setError(err.message);
        console.error(err);
      } finally {
        setIsLoading(false); 
      }
    };

    loadStories(); 

  }, [activeCategory]); 

  
  const handleCategoryClick = (categoryCode) => {
    setActiveCategory(categoryCode); // 탭 변경

    const caselDomainName = CASEL_MAP[categoryCode] || categoryCode;
    ReactGA.event({
      category: "Story",
      action: "casel_tab_click",
      label: "CASEL 탭 클릭",
      casel_domain: caselDomainName 
    });
    console.log(`[Analytics] casel_tab_click (param: ${caselDomainName})`);
  };

  const handleStorySelect = (storyId) => {
    ReactGA.event({
      category: "Story",
      action: "book_select",
      label: "동화 상세 이동",
      story_id: storyId 
    });
    console.log(`[Analytics] book_select (param: ${storyId})`);

    navigate(`/story/${storyId}`);
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <button style={styles.parentButton} onClick={handleGoToParentsPage}>
          부모 페이지
        </button>
      </header>

      <div style={styles.contentWrapper}>
        <nav style={styles.categoryNav}>
          {categories.map((cat) => (
            <button
              key={cat.code} 
              onClick={() => handleCategoryClick(cat.code)}
              style={{
                ...styles.categoryButton,
                ...(activeCategory === cat.code ? styles.activeCategory : {})
              }}
            >
              {cat.name} 
            </button>
          ))}
        </nav>

        <main style={styles.storyGrid}>
          {isLoading && <p style={styles.loadingText}>동화 목록을 불러오는 중...</p>}
          {error && <p style={styles.errorText}>오류가 발생했습니다: {error}</p>}
          {!isLoading && !error && stories.map((story) => (
            <div
              key={story.id} 
              onClick={() => handleStorySelect(story.id)}
              style={styles.storyCard}
            >
              <div style={styles.storyImageContainer}>
                <img src={story.thumbnail_img_url} alt={story.title} style={styles.storyImage} />
              </div>
              <div style={styles.storyInfo}>
                <p style={styles.storyTitle}>{story.title}</p>
              </div>
            </div>
          ))}
          {!isLoading && !error && stories.length === 0 && (
            <p style={styles.loadingText}>이 카테고리에는 동화가 없습니다.</p>
          )}
        </main>
      </div>
    </div>
  );
};

// ---  Styles  ---
const styles = {
  container: {
    height: '100%',
    width: '100%',
    // 내부 패딩 비율로 조절
    padding: '2% 0', 
    backgroundColor: 'var(--color-main)',
    display: 'flex',
    flexDirection: 'column',
    boxSizing: 'border-box',
    overflow: 'hidden' 
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0 5% 1.5% 4%',
    width: '100%',
    boxSizing: 'border-box',
    flexShrink: 0,
  },
  parentButton: {
    background: 'var(--color-main)',
    border: '2px solid var(--color-text-dark)',
    padding: 'clamp(4px, 1.2vh, 8px) clamp(8px, 3vw, 17px)',
    borderRadius: '25px',
    fontSize: 'clamp(12px, 2.5vw, 16px)',
    fontFamily: "var(--font-family-primary)",
    color: 'var(--color-text-dark)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
    whiteSpace: 'nowrap',
  },
  contentWrapper: {
    width: '94%',
    margin: '0 auto', 
    display: 'flex',
    flexDirection: 'column',
    flexGrow: 1,
    overflow: 'hidden', 
    minHeight: 0
  },
  categoryNav: {
    display: 'flex',
    width: '100%', 
    borderBottom: '2px solid #D1D5DB', 
    marginBottom: '-2px',
    zIndex: 1,
    flexShrink: 0,
    overflowX: 'auto',
    scrollbarWidth: 'none',
    '&::-webkit-scrollbar': { display: 'none' },
    gap: '0px'
  },
  categoryButton: {
    flex: 1, 
    padding: '1.3vh 0',
    fontSize: 'clamp(0.55rem, 1.9vw, 0.75rem)', // 글자 크기 적당히
    fontWeight: 'normal',
    fontFamily: "var(--font-family-primary)",
    border: 'none',
    cursor: 'pointer',
    backgroundColor: 'transparent', // 배경 투명 (기존 느낌)
    color: '#666',
    textAlign: 'center',
    transition: 'all 0.2s ease',
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
    overflow: 'hidden',
    minWidth: '50px',
    borderTopLeftRadius: '10px',
    borderTopRightRadius: '10px',
  },
  activeCategory: {
    backgroundColor: 'var(--color-text-dark)', 
    color: 'var(--color-text-light)',
    borderTopLeftRadius: '10px', 
    borderTopRightRadius: '10px',
  },
  storyGrid: {
    flexGrow: 1,
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)', 
    gap: '4%', 
    padding: '15px 4% 15px 4%',
    alignContent: 'start',
    overflowY: 'auto', 
    backgroundColor: '#cecfcfff',
    borderBottomLeftRadius: '15px', 
    borderBottomRightRadius: '15px', 
    scrollbarWidth: 'none',
    '&::-webkit-scrollbar': { display: 'none' },
    minHeight: 0,
  },
  storyCard: {
    border: '2px solid var(--color-text-dark)',
    borderRadius: '10px',
    overflow: 'hidden',
    cursor: 'pointer',
    backgroundColor: '#fff',
    boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    height: '100%'
  },

  storyImageContainer: {
    width: '100%',
    position: 'relative',
    backgroundColor: '#F3F4F6',
    borderBottom: '1px solid #E5E7EB',
    height: '80%',
    flexShrink: 0,
  },
  storyImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  storyInfo: {
    padding: 'clamp(8px, 1.5vh, 12px) clamp(5px, 1vw, 10px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    textAlign: 'center',
    height: '20%',
    flexShrink: 0,
  },
  storyTitle: {
    margin: '0',
    fontSize: 'clamp(0.7rem, 2.5vw, 0.9rem)', 
    fontFamily: "var(--font-family-primary)",
    color: 'var(--color-text-dark)',
    lineHeight: '1.2',
    
    // 두 줄 넘어가면 ... 처리
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  },
  loadingText: {
    gridColumn: '1 / -1',
    textAlign: 'center',
    padding: '20px',
    color: '#666'
  },
  errorText: {
    gridColumn: '1 / -1',
    textAlign: 'center',
    color: 'red',
  }
};

export default StoryList;