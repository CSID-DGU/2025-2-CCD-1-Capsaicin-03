// src/pages/SettingPage.jsx

import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import leftArrowIcon from '../assets/left_arrow.svg';
import profileIcon from '../assets/profile_icon.svg';
import logoutIcon from '../assets/logout.svg';
import withdrawIcon from '../assets/withdraw.svg';

const SettingPage = () => {
    const navigate = useNavigate();

    const handleBackClick = () => {
        navigate(-1);
    };

    const handleEditChildInfo = () => {
        navigate('/parents/settings/edit-child');
    };

    const handleLogout = async () => {
        try {
            //Supabase 로그아웃 요청
            const { error } = await supabase.auth.signOut();
            
            if (error) {
                throw error;
            }

            // 로그아웃 성공 시 홈으로 리디렉션
            console.log("로그아웃 성공");
            navigate('/'); 
            
        } catch (error) {
            console.error("로그아웃 실패:", error.message);
            alert("로그아웃 중 오류가 발생했습니다.");
        }
    };

    const handleWithdraw = () => {
        window.open(
            'https://parallel-chiller-8d1.notion.site/2a6fbd7a5e8d80318e3ee691651f0be5', 
            '_blank',
            'noopener,noreferrer' 
        );
    };

    return (
        <div style={styles.container}>
            <header style={styles.header}>
                <div style={styles.headerLeft}>
                    <button onClick={handleBackClick} style={styles.backButton}>
                        <img src={leftArrowIcon} alt="뒤로가기" style={styles.backIconImg} />
                    </button>
                    <span style={styles.pageTitle}>설정</span>
                </div>
            </header>

            <main style={styles.mainContent}>
                
                <button style={styles.leftButton} onClick={handleEditChildInfo}>
                    <div style={styles.iconWrapper}>
                        <img src={profileIcon} alt="아이 정보 수정" style={styles.largeIconImg} />
                    </div>
                    <span style={styles.buttonText}>아이 정보 수정하기</span>
                </button>

                <div style={styles.rightColumn}>
                    <button style={styles.rightButton} onClick={handleLogout}>
                        <div style={styles.smallIconWrapper}>
                            <img src={logoutIcon} alt="로그아웃" style={styles.smallIconImg} />
                        </div>
                        <span style={styles.buttonTextSmall}>로그아웃</span>
                    </button>

                    <button style={styles.rightButton} onClick={handleWithdraw}>
                        <div style={styles.smallIconWrapper}>
                            <img src={withdrawIcon} alt="탈퇴하기" style={styles.smallIconImg} />
                        </div>
                        <span style={styles.buttonTextSmall}>탈퇴하기</span>
                    </button>
                </div>

            </main>
        </div>
    );
};

// --- Styles ---
const styles = {
    container: {
        backgroundColor: 'var(--color-second)', 
        height: '100%',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        padding: 'clamp(5px, 3vw, 20px)',
        position: 'relative',
        overflow: 'hidden',
    },
    header: {
        display: 'flex',
        justifyContent: 'flex-start',  
        alignItems: 'center',
        marginBottom: 'clamp(5px, 2vh, 10px)',
        padding: 'clamp(1px, 1vw, 5px) clamp(1px, 1vw, 5px)',
        width: '100%', 
        alignSelf: 'center', 
    },
    headerLeft: {
        display: 'flex',
        alignItems: 'center',
        gap: 'clamp(10px, 3vw, 15px)', 
    },
    backButton: {
        background: 'var(--color-fourth)', 
        border: 'clamp(2px, 0.5vw, 3px) solid var(--color-text-dark)', 
        borderRadius: '50%',
        width: 'clamp(30px, 8vw, 40px)',
        height: 'clamp(30px, 8vw, 40px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        padding: 0,
        boxShadow: '0 4px 6px rgba(0,0,0,0.15)', 
    },
    backIconImg: {
        width: '60%', 
        height: '60%',
        objectFit: 'contain',
    },
    pageTitle: {
        fontSize: 'clamp(10px, 4vw, 22px)',
        color: 'var(--color-text-dark)',
        margin: 0,
        fontFamily: "var(--font-family-primary)", 
    },
    mainContent: {
        flex: 1,
        width: 'min(85%, 700px)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'stretch',
        gap: 'clamp(5px, 2vw, 20px)', 
        alignSelf: 'center',
    },
    
    leftButton: {
        flex: 1.2, 
        height: 'auto',
        backgroundColor: 'var(--color-main)', 
        border: 'clamp(2px, 0.4vw, 3px) solid var(--color-text-dark)',
        borderRadius: 'clamp(15px, 3vw, 25px)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        cursor: 'pointer',
        boxShadow: '0 4px 8px rgba(0,0,0,0.15)',
    },
    
    rightColumn: {
        flex: 1,
        height: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 'clamp(5px, 2vw, 20px)', 
    },
    
    rightButton: {
        flex: 1, 
        backgroundColor: 'var(--color-third)', 
        border: 'clamp(2px, 0.4vw, 3px) solid var(--color-text-dark)',
        borderRadius: 'clamp(15px, 3vw, 25px)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        cursor: 'pointer',
        boxShadow: '0 4px 8px rgba(0,0,0,0.15)',
    },

    iconWrapper: {
        marginBottom: 'clamp(5px, 2vh, 20px)', 
    },
    largeIconImg: {
        width: 'clamp(30px, 6vw, 45px)',
        height: 'clamp(30px, 6vw, 45px)',
        objectFit: 'contain',
    },

    smallIconWrapper: {
        marginBottom: 'clamp(2px, 1.0vh, 15px)', 
    },
    smallIconImg: {
        width: 'clamp(15px, 4vw, 35px)',
        height: 'clamp(15px, 4vw, 35px)',
        objectFit: 'contain',
    },

    buttonText: {
        fontSize: 'clamp(14px, 3vw, 22px)',
        color: 'var(--color-text-dark)',
        fontFamily: "var(--font-family-primary)",
    },
    buttonTextSmall: {
        fontSize: 'clamp(12px, 2.5vw, 20px)',
        color: 'var(--color-text-dark)',
        fontFamily: "var(--font-family-primary)",
    },
};

export default SettingPage;