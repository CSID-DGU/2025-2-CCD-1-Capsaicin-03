// src/pages/Home.jsx
import { useNavigate } from 'react-router-dom';
import MainLogo from '../assets/Main.svg';

const Home = () => {
  const navigate = useNavigate();
  const handleScreenClick = () => {
     navigate('/login'); 
  };

  const handleParentsPageClick = (event) => {
    event.stopPropagation(); 
    navigate('/parents');
  };

  const handleStartClick = (event) => {
     event.stopPropagation(); 
     handleScreenClick(); 
  };

  return (
    <div style={styles.container} onClick={handleScreenClick}>
      <button style={styles.parentsButton} onClick={handleParentsPageClick}>
        부모 페이지
      </button>
      <img src={MainLogo} alt="나무럭무럭 로고" style={styles.mainLogo} />
      <button style={styles.startButton} onClick={handleStartClick}>
        시작하기
      </button>
    </div>
  );
};

// --- style ---
const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center', 
    alignItems: 'center', 
    width: '100%',
    height: '100%', 
    backgroundColor: 'var(--color-main)', 
    position: 'relative', 
    margin: 0,
    padding: 0,
    boxSizing: 'border-box', 
  },
  
  mainLogo: {
    width: '45%', 
    maxWidth: '260px', 
    height: 'auto',
    marginBottom: '1%', 
  },
  
  parentsButton: {
    position: 'absolute',
    top: '5%',
    left: '4%',
    padding: '1.5% 3%', 
    fontSize: 'clamp(12px, 2.5vw, 16px)', 
    backgroundColor: 'var(--color-main)', 
    color: 'var(--color-text-dark)', 
    border: '2.5px solid var(--color-text-dark)',
    borderRadius: '20px',
    fontFamily: 'var(--font-family-primary)',
    cursor: 'pointer',
    boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
    zIndex: 10, 
    whiteSpace: 'nowrap',
  },
  
  startButton: {
    width: '21%',
    maxWidth: '200px',
    padding: '2% 0',
    backgroundColor: 'var(--color-fourth)', 
    color: 'var(--color-text-dark)',
    border: '3px solid var(--color-text-dark)',
    borderRadius: '30px',
    fontSize: 'clamp(14px, 4vw, 22px)', 
    
    cursor: 'pointer',
    boxShadow: '0 4px 10px rgba(0,0,0,0.2)',
    marginTop: '5%',
    fontFamily: 'var(--font-family-primary)',
    whiteSpace: 'nowrap',
  }
};

export default Home;