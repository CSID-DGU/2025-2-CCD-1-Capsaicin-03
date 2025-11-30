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
                <style>
                    {`
                        .custom-scrollbar::-webkit-scrollbar {
                            width: 16px;
                        }
                        .custom-scrollbar::-webkit-scrollbar-track {
                            background: var(--color-text-light); 
                            border : 2px solid var(--color-text-dark);
                            border-radius: 10px;
                        }
                        .custom-scrollbar::-webkit-scrollbar-thumb {
                            background: var(--color-main);
                            border-radius: 10px;
                            background-clip: padding-box;
                            border: 4px solid transparent;
                        }
                    `}
                </style>

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
        padding: '20px',
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
        boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
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
    listContainer: {
        flex: 1,
        position: 'relative',
        overflow: 'hidden', 
        marginBottom: '20px', 
        width: '100%',
        display: 'flex',
        justifyContent: 'center',
    },
    scrollArea: {
        height: '100%',
        width: '100%',
        overflowY: 'auto',
        paddingRight: '10px', 
        display: 'flex',
        flexDirection: 'column',
        gap: '12px', 
        paddingBottom: '20px'
    },
  chatBubble: {
        flex: 1, 
        minHeight: '40px',
        border: '2px solid var(--color-text-dark)', 
        borderRadius: '25px',     
        padding: '10px 20px',     
        boxSizing: 'border-box',
        boxShadow: '0 4px 4px rgba(0,0,0,0.1)',
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
        width: '40px',
        height: '40px',
        borderRadius: '50%',
        border: '2px solid var(--color-text-dark)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        fontSize: '16px',
        color: 'var(--color-text-dark)',
        flexShrink: 0, 
        fontFamily: "var(--font-family-primary)",
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    },
    chatText: {
        margin: 0,
        fontSize: '16px',
        color: 'var(--color-text-dark)',
        lineHeight: '1.4',
        wordBreak: 'keep-all',
        display: 'flex',
        alignItems: 'center'
    },
    warningIconImg: {
        width: '18px',
        height: '18px',
        marginRight: '5px'
    },
    loadingText: {
        textAlign: 'center',
        color: 'var(--color-text-light)',
        fontSize: '1.2rem',
        marginTop: '50px',
    },
    failedNotice: {
        textAlign: 'center',
        color: 'var(--color-text-dark)',
        marginTop: '20px',
        marginBottom: '10px',
        fontFamily: "var(--font-family-primary)"
    }
};

export default ChatDetailPage;