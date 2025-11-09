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
      <div style={styles.bottomBar}></div>
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
    cursor: 'pointer', 
    paddingBottom: '30px', 
    boxSizing: 'border-box', 
  },
  mainLogo: {
    width: '50%', 
    maxWidth: '250px', 
    marginBottom: '10px', 
  },
  parentsButton: {
    position: 'absolute',
    top: '20px',
    left: '20px',
    padding: '8px 16px', 
    backgroundColor: 'var(--color-main)', 
    color: 'var(--color-text-dark)', 
    border: '2px solid var(--color-text-dark)',
    borderRadius: '20px',
    fontSize: '0.9rem',
    fontFamily: 'var(--font-family-primary)',
    cursor: 'pointer',
    boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
    zIndex: 10, 
  },
  startButton: {
    padding: '12px 28px', 
    backgroundColor: 'var(--color-fourth)', 
    color: 'var(--color-text-dark)',
    border: '3px solid var(--color-text-dark)',
    borderRadius: '30px',
    fontSize: '1.3rem', 
    cursor: 'pointer',
    boxShadow: '0 4px 10px rgba(0,0,0,0.2)',
    marginTop: '30px', 
    fontFamily: 'var(--font-family-primary)'
  },
  bottomBar: {
    position: 'absolute',
    bottom: '10px', 
    left: '50%', 
    transform: 'translateX(-50%)', 
    width: '130px', 
    height: '5px',
    backgroundColor: 'rgba(0, 0, 0, 0.3)', 
    borderRadius: '5px',
  },
  
};

export default Home;