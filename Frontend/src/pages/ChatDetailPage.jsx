// src/pages/ChatDetailPage.jsx

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import leftArrowIcon from '../assets/left_arrow.svg';
import { getChatDetail } from '../api/parentsApi';
import warningIcon from '../assets/warning.svg';
const ChatDetailPage = () => {
    const { conversationId } = useParams();
    const navigate = useNavigate();
    const [chatLogs, setChatLogs] = useState([]);
    const [chatStatus, setChatStatus] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchChatDetail = async () => {
            if (!conversationId) return;

            setIsLoading(true);
            try {
                const response = await getChatDetail(conversationId);

                console.log("✅ API 응답 전체 데이터:", response);
                console.log("📄 대화 로그(logs):", response?.data?.logs);

                if (response && response.success) {
                    setChatLogs(response.data.logs);
                    setChatStatus(response.data.status);
                } else {
                    console.error("데이터를 불러오지 못했습니다:", response?.message);
                }
            } catch (error) {
                console.error("대화 상세 정보를 불러오는데 실패했습니다.", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchChatDetail();
    }, [conversationId]);

    const handleBackClick = () => {
        navigate(-1);
    };

    return (
        <div style={styles.container}>
            <header style={styles.header}>
                <div style={styles.headerLeft}>
                    <button onClick={handleBackClick} style={styles.backButton}>
                        <img src={leftArrowIcon} alt="뒤로가기" style={styles.backIconImg} />
                    </button>
                    <span style={styles.pageTitle}>대화 보기</span>
                </div>
            </header>

            <main style={styles.listContainer}>
                <div className="custom-scrollbar" style={styles.scrollArea}>
                    {isLoading ? (
                        <div style={styles.loadingText}>대화를 불러오는 중...</div>
                    ) : (
                        <>
                            {chatLogs.map((log) => {
                                const isAi = log.speaker === 'AI';
                                const isViolated = log.is_violated;
                                return (
                                    <div key={log.log_id} style={styles.messageRow}>
                                        {isAi && ( <div style={{...styles.avatar, backgroundColor: 'var(--color-third)'}}> AI </div> )}
                                        <div style={{ ...styles.chatBubble, backgroundColor: isAi ? 'var(--color-third)' : 'var(--color-main)', border: isViolated ? '2px solid var(--color-fourth)' : '2px solid var(--color-text-dark)', marginLeft: isAi ? '10px' : '0', marginRight: isAi ? '0' : '10px' }}>
                                                <p style={{ ...styles.chatText, color: isViolated ? 'var(--color-fourth)' : 'var(--color-text-dark)', }}>
                                                    {isViolated && ( <img src={warningIcon} alt="warning" style={styles.warningIconImg} /> )}
                                                    {log.content}
                                                </p>
                                        </div>
                                        {!isAi && ( <div style={{...styles.avatar, backgroundColor: 'var(--color-main)'}}> 아이 </div> )}
                                    </div>
                                );
                            })}
                            
                            {chatStatus === 'FAILED' && (
                                <div style={styles.failedNotice}>
                                    ---------- 학습 도중 이탈로 대화 내용은 진행된 부분까지만 저장됩니다. ----------
                                </div>
                            )}
                            
                        </>
                    )}
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
        justifyContent: 'flex-start', // 왼쪽 정렬 유지
        alignItems: 'center',
        marginBottom: 'clamp(5px, 2vh, 10px)',
        padding: 'clamp(1px, 1vw, 5px) clamp(1px, 1vw, 5px)',
        width: '100%', // 전체 너비 사용
        alignSelf: 'center', // 중앙 정렬
    },
    headerLeft: {
        display: 'flex',
        alignItems: 'center',
        gap: 'clamp(10px, 3vw, 15px)', // 간격 반응형
    },
    backButton: {
        background: 'var(--color-fourth)', 
        border: 'clamp(2px, 0.5vw, 3px) solid var(--color-text-dark)', // 테두리 반응형
        borderRadius: '50%',
        width: 'clamp(30px, 8vw, 40px)',
        height: 'clamp(30px, 8vw, 40px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        padding: 0,
        boxShadow: '0 4px 6px rgba(0,0,0,0.15)', // 그림자 유지
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
    listContainer: {
        flex: 1,
        position: 'relative',
        overflow: 'auto', 
        width: '98%',
        alignSelf: 'center',
    },
    scrollArea: {
        height: '100%',
        overflowY: 'auto',
        paddingRight: 'clamp(5px, 1vw, 10px)', 
        display: 'flex',
        flexDirection: 'column',
        gap: 'clamp(8px, 1.5vh, 12px)',
        paddingBottom: 'clamp(10px, 2vh, 20px)',
    },
    chatBubble: {
        flex: 1, 
        minHeight: 'clamp(20px, 5vh, 50px)',
        border: 'clamp(1px, 0.3vw, 2px) solid var(--color-text-dark)', 
        borderRadius: 'clamp(20px, 5vw, 30px)',     
        padding: 'clamp(5px, 2vw, 10px) clamp(15px, 4vw, 25px)',     
        boxSizing: 'border-box',
        boxShadow: '0 4px 6px rgba(0,0,0,0.15)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center', 
        textAlign: 'center',
    },
  
    messageRow: {
        display: 'flex',
        width: '100%',
        alignItems: 'center',
        justifyContent: 'space-between', 
    },

    avatar: {
        // ✨ [수정] 아바타 크기 반응형
        width: 'clamp(30px, 8vw, 40px)',
        height: 'clamp(30px, 8vw, 40px)',
        borderRadius: '50%',
        border: 'clamp(1px, 0.3vw, 2px) solid var(--color-text-dark)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        fontSize: 'clamp(12px, 3vw, 15px)',
        color: 'var(--color-text-dark)',
        flexShrink: 0, 
        fontFamily: "var(--font-family-primary)",
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    },
    chatText: {
        margin: 0,
        fontSize: 'clamp(12px, 3vw, 18px)',
        color: 'var(--color-text-dark)',
        lineHeight: '1.4',
        wordBreak: 'keep-all',
        display: 'flex',
        alignItems: 'center'
    },
    warningIconImg: {
        // ✨ [수정] 경고 아이콘 크기 반응형
        width: 'clamp(16px, 3.5vw, 22px)',
        height: 'clamp(16px, 3.5vw, 22px)',
        
        marginRight: '5px'
    },
    loadingText: {
        textAlign: 'center',
        color: 'var(--color-text-light)',
        
        // ✨ [수정] 폰트 크기 반응형
        fontSize: 'clamp(1.2rem, 4vw, 1.5rem)',
        
        marginTop: '50px',
        fontFamily: "var(--font-family-primary)",
    },
    failedNotice: {
        textAlign: 'center',
        color: 'var(--color-text-dark)',
        marginTop: 'clamp(15px, 3vh, 25px)',
        marginBottom: 'clamp(5px, 1vh, 15px)',
        fontFamily: "var(--font-family-primary)",
        fontSize: 'clamp(0.3rem, 2.2vw, 1rem)', 
    }
};

export default ChatDetailPage;