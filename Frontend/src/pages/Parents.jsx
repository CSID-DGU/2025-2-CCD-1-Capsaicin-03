// src/pages/Parents.jsx

import { useNavigate } from 'react-router-dom';
import homeIcon from '../assets/home_icon.svg';
import settingIcon from '../assets/setting.svg';

const Parents = () => {
    const navigate = useNavigate();
  
    const handleFeedbackClick = () => {
        navigate('/parents/feedback');
    };

    const handleConversationClick = () => {
        navigate('/parents/chat');
    };

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <button onClick={() => navigate('/stories')} style={styles.homeButton} aria-label="홈으로 이동">
                    <img src={homeIcon} alt="홈으로" style={styles.iconStyle} />
                </button>
                
                <button onClick={() => navigate('/parents/settings')} style={styles.settingsButton} aria-label="설정">
                    <img src={settingIcon} alt="설정" style={styles.iconStyle} />
                </button>
            </div>

            <div style={styles.mainContent}>
                <div
                    style={{ ...styles.buttonBox, ...styles.feedbackBox }}
                    onClick={handleFeedbackClick}
                    role="button"
                    tabIndex="0"
                >
                    <div style={styles.buttonTitle}>피드백 보기</div>
                    <div style={styles.buttonDescription}>아이의 학습 상태를 확인할 수 있어요</div>
                </div>
                <div
                    style={{ ...styles.buttonBox, ...styles.conversationBox }}
                    onClick={handleConversationClick}
                    role="button"
                    tabIndex="0"
                >
                    <div style={styles.buttonTitle}>대화 보기</div>
                    <div style={styles.buttonDescription}>아이가 AI와 나눈 대화를 볼 수 있어요</div>
                </div>
            </div>
        </div>
    );
};

// --- styles ---
const styles = {
    container: {
        backgroundColor: 'var(--color-second)', 
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'clamp(15px, 5vw, 40px)', 
        boxSizing: 'border-box',
        position: 'relative',
    },
    header: {
        position: 'absolute',
        top: 'clamp(10px, 5vw, 15px)',
        left: 'clamp(10px, 5vw, 20px)',
        right: 'clamp(10px, 5vw, 20px)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 'clamp(2px, 1vw, 5px) clamp(2px, 1vw, 5px)',
    },
    homeButton: {
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
        boxShadow: 'clamp(2px, 0.5vw, 4px) clamp(2px, 0.5vw, 4px) clamp(5px, 1vw, 10px) rgba(0,0,0,0.1)',
    },
    settingsButton: {
        background: 'var(--color-main)',
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
        boxShadow: 'clamp(2px, 0.5vw, 4px) clamp(2px, 0.5vw, 4px) clamp(5px, 1vw, 10px) rgba(0,0,0,0.1)',
    },
    iconStyle: {
        width: '60%',
        height: '60%',
        objectFit: 'contain',
    },
    mainContent: {
        display: 'flex',
        flexWrap: 'wrap', 
        gap: 'clamp(10px, 3vw, 30px)', 
        justifyContent: 'center', 
        alignItems: 'center',
        width: '100%',
        maxWidth: 'clamp(300px, 90vw, 550px)', 
    },
    buttonBox: {
        width: 'clamp(100px, 30vw, 350px)', 
        height: 'clamp(60px, 12vh, 140px)',
        maxWidth: '45%',
        borderRadius: 'clamp(10px, 2vw, 15px)',
        padding: 'clamp(15px, 3vw, 20px)',
        textAlign: 'center',
        cursor: 'pointer',
        border: 'clamp(1px, 0.3vw, 2px) solid var(--color-text-dark)',
        boxShadow: 'clamp(1px, 0.2vw, 2px) clamp(1px, 0.2vw, 2px) clamp(3px, 0.5vw, 5px) rgba(0, 0, 0, 0.2)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        transition: 'transform 0.2s ease',
    },
    feedbackBox: {
        backgroundColor: 'var(--color-main)',
    },
    conversationBox: {
        backgroundColor: 'var(--color-third)', 
    },
    buttonTitle: {
        fontSize: 'clamp(18px, 4vw, 24px)', 
        color: 'var(--color-text-dark)',
        marginBottom: 'clamp(5px, 1vw, 10px)',
        fontFamily: 'var(--font-family-primary)',
    },
    buttonDescription: {
        fontSize: 'clamp(8px, 2vw, 14px)', 
        color: 'var(--color-text-dark)',
        lineHeight: '1.4',
        fontFamily: 'var(--font-family-primary)',
        wordBreak: 'keep-all',
    },
};    

export default Parents;