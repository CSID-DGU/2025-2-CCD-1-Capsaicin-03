// src/pages/StoryList.jsx

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';


const categories = [
  '내 마음 살펴보기',
  '마음 차분히 다루기',
  '다른 마음 이해하기',
  '함께 이야기하고 듣기',
  '생각하고 바르게 선택하기'
];

const allStories = [
  // 1. 내 마음 살펴보기
  { id: '1-1', title: '콩쥐 팥쥐', category: '내 마음 살펴보기', image: '/images/story-thumbnails/1-1.png' },
  { id: '1-2', title: '가난한 유산', category: '내 마음 살펴보기', image: '/images/story-thumbnails/1-2.png' },
  // 2. 마음 차분히 다루기
  { id: '2-1', title: '삼년 고개', category: '마음 차분히 다루기', image: '/images/story-thumbnails/2-1.png' },
  { id: '2-2', title: '나무 도령', category: '마음 차분히 다루기', image: '/images/story-thumbnails/2-2.png' },
  // 3. 다른 마음 이해하기
  { id: '3-1', title: '선녀와 나무꾼', category: '다른 마음 이해하기', image: '/images/story-thumbnails/3-1.png' },
  { id: '3-2', title: '해님 달님', category: '다른 마음 이해하기', image: '/images/story-thumbnails/3-2.png' },
  // 4. 함께 이야기하고 듣기
  { id: '4-1', title: '사이 좋은 형제', category: '함께 이야기하고 듣기', image: '/images/story-thumbnails/4-1.png' },
  { id: '4-2', title: '혹부리 영감님', category: '함께 이야기하고 듣기', image: '/images/story-thumbnails/4-2.png' },
  // 5. 생각하고 바르게 선택하기
  { id: '5-1', title: '버릇 고친 임금님', category: '생각하고 바르게 선택하기', image: '/images/story-thumbnails/5-1.png' },
  { id: '5-2', title: '효자와 불효자', category: '생각하고 바르게 선택하기', image: '/images/story-thumbnails/5-2.png' },
];


const StoryList = () => {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState(categories[0]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleStorySelect = (storyId) => {
    navigate(`/story/${storyId}`);
  };

  const filteredStories = allStories.filter(story => story.category === activeCategory);

  return (
    <div style={styles.container}>
      {isModalOpen && <ParentPinModal onClose={() => setIsModalOpen(false)} />}

      <header style={styles.header}>
        <button style={styles.parentButton} onClick={() => setIsModalOpen(true)}>
          부모 페이지
        </button>
      </header>

      {/* ✨ categoryNav와 storyGrid를 감싸는 새로운 div 추가 */}
      <div style={styles.contentWrapper}>
        <nav style={styles.categoryNav}>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              style={{
                ...styles.categoryButton,
                ...(activeCategory === cat ? styles.activeCategory : {})
              }}
            >
              {cat}
            </button>
          ))}
        </nav>

        <main style={styles.storyGrid}>
          {filteredStories.map((story) => (
            <div
              key={story.id}
              onClick={() => handleStorySelect(story.id)}
              style={styles.storyCard}
            >
              <div style={styles.storyImageContainer}>
                <img src={story.image} alt={story.title} style={styles.storyImage} />
              </div>
              <div style={styles.storyInfo}>
                <p style={styles.storyTitle}>{story.title}</p>
              </div>
            </div>
          ))}
        </main>
      </div>
    </div>
  );
};

// --- ✨ Styles 수정 ---
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