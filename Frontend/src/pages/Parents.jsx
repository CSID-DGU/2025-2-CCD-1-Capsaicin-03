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
            
            <div style={{ position: 'absolute', bottom: '20px' }}>
                <div style={{ width: '100px', height: '5px', backgroundColor: '#333', borderRadius: '2.5px' }}></div>
            </div>
        </div>
    );
};

// --- styles ---
const styles = {
    container: {
        backgroundColor: 'var(--color-second)', 
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        position: 'relative',
    },
    header: {
        position: 'absolute',
        top: '20px',
        left: '20px',
        right: '20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    homeButton: {
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
        boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
    },
    settingsButton: {
        background: 'var(--color-main)',
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
        boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
    },
    iconStyle: {
        width: '60%',
        height: '60%',
        objectFit: 'contain',
    },
    mainContent: {
        display: 'flex',
        gap: '30px', 
        justifyContent: 'center',
        alignItems: 'center',
    },
    buttonBox: {
        width: '250px',
        height: '90px',
        borderRadius: '15px',
        padding: '20px',
        textAlign: 'center',
        cursor: 'pointer',
        border: '2px solid var(--color-text-dark)',
        boxShadow: '2px 2px 5px rgba(0, 0, 0, 0.2)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
    },
    feedbackBox: {
        backgroundColor: 'var(--color-main)',
    },
    conversationBox: {
        backgroundColor: 'var(--color-third',
    },
    buttonTitle: {
        fontSize: '24px',
        color: 'var(--color-text-dark)',
        marginBottom: '5px',
    },
    buttonDescription: {
        fontSize: '14px',
        color: 'var(--color-text-dark)',
        lineHeight: '1.3',
    },
};    

export default Parents;