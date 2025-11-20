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
            'https://www.notion.so/2a6fbd7a5e8d80a0aa2afb36beb313ae', 
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

             <div style={{ position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)' }}>
                <div style={{ width: '100px', height: '5px', backgroundColor: '#333', borderRadius: '2.5px' }}></div>
            </div>
        </div>
    );
};

const styles = {
    container: {
        backgroundColor: 'var(--color-second)', 
        height: '100%',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        padding: '20px 20px 40px 20px',
        position: 'relative',
        overflow: 'hidden',
        alignItems: 'center', 
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '15px',
        paddingTop: '5px',
        width: '100%', 
        maxWidth: '732px', 
    },
    headerLeft: {
        display: 'flex',
        alignItems: 'center',
        gap: '15px',
    },
    backButton: {
        background: 'var(--color-fourth)', 
        border: '3px solid var(--color-text-dark)',
        borderRadius: '50%',
        width: '40px',
        height: '40px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        padding: 0,
        boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
    },
    backIconImg: {
        width: '60%',
        height: '60%',
        objectFit: 'contain',
    },
    pageTitle: {
        fontSize: '1.3rem',
        color: 'var(--color-text-dark)',
        margin: 0,
        fontFamily: "var(--font-family-primary)",
    },    
    mainContent: {
        flex: 1,
        width: '80%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '12px', 
    },
    
    leftButton: {
        flex: 1.2, 
        height: '220px',
        backgroundColor: 'var(--color-main)', 
        border: '3px solid var(--color-text-dark)',
        borderRadius: '20px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        cursor: 'pointer',
        boxShadow: '2px 4px 8px rgba(0,0,0,0.15)',
    },
    
    rightColumn: {
        flex: 1,
        height: '220px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px', 
    },
    
    rightButton: {
        flex: 1,
        backgroundColor: 'var(--color-third)', 
        border: '3px solid var(--color-text-dark)',
        borderRadius: '20px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        cursor: 'pointer',
        boxShadow: '2px 4px 8px rgba(0,0,0,0.15)',
    },

    iconWrapper: {
        marginBottom: '20px', 
    },
    largeIconImg: {
        width: '40px',
        height: '40px',
        objectFit: 'contain',
    },

    smallIconWrapper: {
        marginBottom: '10px', 
    },
    smallIconImg: {
        width: '28px',
        height: '28px',
        objectFit: 'contain',
    },

    buttonText: {
        fontSize: '20px',
        color: 'var(--color-text-dark)',
        fontFamily: "var(--font-family-primary)",
    },
    buttonTextSmall: {
        fontSize: '18px',
        color: 'var(--color-text-dark)',
        fontFamily: "var(--font-family-primary)",
    },
};

export default SettingPage;