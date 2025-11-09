// src/pages/StoryList.jsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchStoriesByCategory } from '../api/storyApi.js';

const categories = [
  { code: 'SA', name: '내 마음 살펴보기' },
  { code: 'SM', name: '마음 차분히 다루기' },
  { code: 'SOA', name: '다른 마음 이해하기' },
  { code: 'RS', name: '함께 이야기하고 듣기' },
  { code: 'RDM', name: '생각하고 바르게 선택하기' }
];


const StoryList = () => {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState(categories[0].code);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [stories, setStories] = useState([]);
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null);

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

  
  const handleStorySelect = (storyId) => {
    navigate(`/story/${storyId}`);
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <button style={styles.parentButton} onClick={() => setIsModalOpen(true)}>
          부모 페이지
        </button>
      </header>

      <div style={styles.contentWrapper}>
        <nav style={styles.categoryNav}>
          {categories.map((cat) => (
            <button
              key={cat.code} 
              onClick={() => setActiveCategory(cat.code)}
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
    padding: '20px 0 20px 0',
    backgroundColor: 'var(--color-main)',
    display: 'flex',
    flexDirection: 'column',
    boxSizing: 'border-box'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0 25px 15px 25px', 
    width: '100%',
    boxSizing: 'border-box',
    flexShrink: 0,
  },
  parentButton: {
    background: 'var(--color-secondary)',
    border: '2px solid var(--color-text-dark)',
    padding: '6px 14px',
    borderRadius: '25px',
    fontSize: '0.9rem',
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
    width: 'calc(100% - 40px)', 
    maxWidth: '700px', 
    margin: '0 auto', 
    display: 'flex',
    flexDirection: 'column',
    flexGrow: 1,
  },
  categoryNav: {
    display: 'flex',
    justifyContent: 'space-between',
    width: '100%', 
    boxSizing: 'border-box',
    borderBottom: '2px solid #D1D5DB',
    marginBottom: '-2px',
    zIndex: 1,
    flexShrink: 0,
    overflow: 'hidden', 
  },
  categoryButton: {
    padding: '8px 8px',
    fontSize: '0.8rem',
    fontWeight: 'normal',
    fontFamily: "var(--font-family-primary)",
    border: 'none',
    borderBottom: '2px solid transparent',
    marginBottom: '-2px',
    borderRadius: '0',
    cursor: 'pointer',
    backgroundColor: 'transparent',
    color: '#666',
    flexShrink: 1,
    textAlign: 'center',
    transition: 'all 0.2s ease',
    whiteSpace: 'nowrap',
    position: 'relative',
  },

  activeCategory: {
    backgroundColor: 'var(--color-text-dark)', 
    color: 'var(--color-text-light)',
    borderTopLeftRadius: '8px', 
    borderTopRightRadius: '8px',
    borderBottom: '2px solid #E5E7EB',
  },

  storyGrid: {
    flexGrow: 1,
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)', 
    gap: '15px', 
    overflowY: 'auto',
    padding: '15px 20px', 
    backgroundColor: '#cecfcfff',
    borderBottomLeftRadius: '15px', 
    borderBottomRightRadius: '15px',
    scrollbarWidth: 'none',
    msOverflowStyle: 'none',
    '&::-webkit-scrollbar': {
      display: 'none',
    },
  },
  storyCard: {
    border: '2px solid var(--color-text-dark)',
    borderRadius: '10px',
    overflow: 'hidden',
    cursor: 'pointer',
    backgroundColor: '#fff',
    boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
    transition: 'transform 0.2s, box-shadow 0.2s',
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
  },
  storyImageContainer: {
    width: '100%',
    paddingTop: '60%',
    position: 'relative',
    backgroundColor: '#F3F4F6',
    borderBottom: '1px solid #E5E7EB',
  },
  storyImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  storyInfo: {
    padding: '10px 8px',
    textAlign: 'center',
    flexGrow: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  storyTitle: {
    margin: '0',
    fontSize: '0.9rem',
    fontFamily: "var(--font-family-primary)",
    color: 'var(--color-text-dark)',
    lineHeight: '1.3',
  },
};

export default StoryList;