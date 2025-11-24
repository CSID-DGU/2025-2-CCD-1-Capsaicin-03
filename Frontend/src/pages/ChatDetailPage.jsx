// src/pages/ChatDetailPage.jsx

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import leftArrowIcon from '../assets/left_arrow.svg';

// --- Mock Data ---
const MOCK_CHAT_RESPONSE = {
    success: true,
    message: "요청이 성공적으로 처리되었습니다.",
    data: {
        id: 12,
        logs: [
            {
                log_id: 1,
                turn_order: 1,
                speaker: "AI",
                content: "놀부가 내 집을 망가뜨려서 너무 화가 나. 너라면 어떤 기분이 들 것 같아?",
                created_at: "2022-01-01T15:00:00+09:00"
            },
            {
                log_id: 2,
                turn_order: 2,
                speaker: "CHILD",
                content: "저도 화가 나요. 울 것 같아요.",
                created_at: "2022-01-01T15:00:05+09:00"
            },
            {
                log_id: 3,
                turn_order: 3,
                speaker: "AI",
                content: "맞아, 화나면 울 수도 있지. 너도 화가 난 적 있어?",
                created_at: "2022-01-01T15:00:10+09:00"
            },
            {
                log_id: 4,
                turn_order: 4,
                speaker: "CHILD",
                content: "네, 친구가 제 그림 찢었을 때요.",
                created_at: "2022-01-01T15:00:15+09:00"
            },
            {
                log_id: 5,
                turn_order: 5,
                speaker: "AI",
                content: "저런, 친구가 그림을 찢어서 정말 속상했겠다. 그때 친구한테 뭐라고 했어?",
                created_at: "2022-01-01T15:00:20+09:00"
            },
             {
                log_id: 6,
                turn_order: 6,
                speaker: "CHILD",
                content: "사과하라고 했어요.",
                created_at: "2022-01-01T15:00:25+09:00"
            }
        ]
    }
};

const ChatDetailPage = () => {
    const { storyId } = useParams(); 
    const navigate = useNavigate();
    const [chatLogs, setChatLogs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchChatDetail = async () => {
            setIsLoading(true);
            try {
                // 나중에 실제 대화 조회 API 호출로 교체
                // Mock 데이터 로딩
                await new Promise(resolve => setTimeout(resolve, 500));
                setChatLogs(MOCK_CHAT_RESPONSE.data.logs);
            } catch (error) {
                console.error("대화 상세 정보를 불러오는데 실패했습니다.", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchChatDetail();
    }, [storyId]);

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
                    `}
                </style>

                <div className="custom-scrollbar" style={styles.scrollArea}>
                    {isLoading ? (
                        <div style={styles.loadingText}>대화를 불러오는 중...</div>
                    ) : (
                        chatLogs.map((log) => {
                            const isAi = log.speaker === 'AI';
                            return (
                                <div key={log.log_id} style={styles.messageRow}>
                                    {isAi && (
                                        <div style={{...styles.avatar, backgroundColor: 'var(--color-third)'}}>
                                            AI
                                        </div>
                                    )}

                                    <div style={{
                                        ...styles.chatBubble,
                                        backgroundColor: isAi ? 'var(--color-third)' : 'var(--color-main)',
                                        marginLeft: isAi ? '10px' : '0',
                                        marginRight: isAi ? '0' : '10px'
                                    }}>
                                        <p style={styles.chatText}>{log.content}</p>
                                    </div>
                                    {!isAi && (
                                        <div style={{...styles.avatar, backgroundColor: 'var(--color-main)'}}>
                                            아이
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </main>

            <div style={{ position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)' }}>
                <div style={{ width: '100px', height: '5px', backgroundColor: '#333', borderRadius: '2.5px' }}></div>
            </div>
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
        height: '40px',
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
    },
    loadingText: {
        textAlign: 'center',
        color: '#var(--color-text-light)',
        fontSize: '1.2rem',
        marginTop: '50px',
    },
};

export default ChatDetailPage;