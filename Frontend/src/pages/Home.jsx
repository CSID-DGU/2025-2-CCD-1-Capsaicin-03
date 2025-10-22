// src/pages/Home.jsx
import React from 'react'; // useEffect 제거 (현재 코드에선 불필요)
import { useNavigate } from 'react-router-dom';

// public 폴더의 로고 경로
const MainLogo = '/Main.svg'; // public 폴더에 main_logo.svg가 있다고 가정

const Home = () => {
  const navigate = useNavigate();

  // 화면 클릭 시 이동 로직 (테스트용: 항상 로그인으로)
  const handleScreenClick = () => {
     navigate('/login'); // 테스트를 위해 항상 로그인 페이지로
    /*
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    if (isLoggedIn === 'true') {
      navigate('/stories');
    } else {
      navigate('/login');
    }
    */
  };

  // 부모 페이지 버튼 클릭 핸들러
  const handleParentsPageClick = (event) => {
    event.stopPropagation(); // 배경 클릭 이벤트 전파 중단
    // TODO: 실제로는 비밀번호 모달을 띄워야 함
    navigate('/parents');
  };


  // 시작하기 버튼 클릭 핸들러 (화면 전체 클릭과 동일하게 동작)
  const handleStartClick = (event) => {
     event.stopPropagation(); // 배경 클릭 이벤트 전파 중단 (선택 사항)
     handleScreenClick(); // 화면 클릭 로직 실행
  };

  return (
    // ✨ 컨테이너 클릭 이벤트 추가
    <div style={styles.container} onClick={handleScreenClick}>
      {/* 부모 페이지 버튼 */}
      <button style={styles.parentsButton} onClick={handleParentsPageClick}>
        부모 페이지
      </button>

      {/* 로고 이미지 */}
      <img src={MainLogo} alt="나무럭무럭 로고" style={styles.mainLogo} />

      {/* 시작하기 버튼 */}
      {/* ✨ 버튼 클릭 시 handleStartClick 호출 */}
      <button style={styles.startButton} onClick={handleStartClick}>
        시작하기
      </button>

      {/* 하단 바 */}
      <div style={styles.bottomBar}></div>
    </div>
  );
};

// 스타일 정의
const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center', // 로고와 버튼을 수직 중앙 근처로
    alignItems: 'center', // 로고와 버튼을 수평 중앙으로
    width: '100%', // ✨ 부모(.app-container) 너비 꽉 채우기
    height: '100%', // ✨ 부모(.app-container) 높이 꽉 채우기
    backgroundColor: 'var(--color-main)', // index.css의 메인 컬러
    position: 'relative', // 자식 absolute 위치 기준
    cursor: 'pointer', // 클릭 가능 표시
    paddingBottom: '50px', // 하단 바 공간 확보 및 콘텐츠 살짝 위로
    boxSizing: 'border-box', // 패딩 포함 크기 계산
  },
  mainLogo: {
    width: '50%', // 로고 크기 조정 (비율 기준)
    maxWidth: '250px', // 최대 크기
    marginBottom: '10px', // 로고와 시작 버튼 사이 간격
  },
  parentsButton: {
    position: 'absolute',
    top: '20px',
    left: '20px',
    padding: '8px 16px', // 패딩 조정
    backgroundColor: 'var(--color-main)', 
    color: 'var(--color-text-dark)', // 어두운 글씨
    border: '2px solid var(--color-text-dark)',
    borderRadius: '20px',
    fontSize: '0.9rem',
    fontFamily: 'var(--font-family-primary)',
    cursor: 'pointer',
    boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
    zIndex: 10, // 다른 요소 위에 오도록
  },
  startButton: {
    padding: '12px 28px', // 패딩 조정
    backgroundColor: 'var(--color-fourth)', // Fourth 컬러
    color: 'var(--color-text-dark)',
    border: '3px solid var(--color-text-dark)',
    borderRadius: '30px',
    fontSize: '1.3rem', // 폰트 크기 조정
    fontFamily: 'var(--font-family-primary)', // 폰트 적용 확인
    cursor: 'pointer',
    boxShadow: '0 4px 10px rgba(0,0,0,0.2)',
    marginTop: '30px', // 로고와의 간격 조정
  },
  bottomBar: {
    position: 'absolute',
    bottom: '10px', // 위치 조정
    left: '50%', // 중앙 정렬
    transform: 'translateX(-50%)', // 중앙 정렬
    width: '130px', // 아이폰 하단 바와 유사한 너비
    height: '5px',
    backgroundColor: 'rgba(0, 0, 0, 0.3)', // 약간 어둡게
    borderRadius: '5px',
  },
  
};

export default Home;