// src/pages/ChatListPage.jsx

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import leftArrowIcon from '../assets/left_arrow.svg';
import rightArrowIcon from '../assets/right_arrow.svg';
import { getChatList } from '../api/parentsApi';

const ChatListPage = () => {
    const navigate = useNavigate();
    const [chatList, setChatList] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchList = async () => {
            setIsLoading(true);
            try {
                const response = await getChatList();

                if (response && response.success) {
                    setChatList(response.data);
                } else {
                    console.error("데이터를 불러오지 못했습니다:", response?.message);
                }
            } catch (error) {
                console.error("대화 목록을 불러오는데 실패했습니다.", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchList();
    }, []);

    const handleBackClick = () => {
        navigate(-1); 
    };

    const handleItemClick = (item) => {
    navigate(`/parents/chat/${item.id}`, { state: { status: item.status } });
};

    const formatDate = (dateString) => {
        // 2025-11-25 -> 25/11/25 형태로 변환
        if (!dateString) return '';
        return dateString.replace(/-/g, '/').slice(2); 
    };

    return (
        <div style={styles.container}>
            <header style={styles.header}>
                <div style={styles.headerLeft}>
                    <button onClick={handleBackClick} style={styles.backButton}>
                        <img src={leftArrowIcon} alt="뒤로가기" style={styles.backIconImg} />
                    </button>
                    <span style={styles.pageTitle}>대화 목록</span>
                </div>
            </header>

            <main style={styles.listContainer}>
                <div className="custom-scrollbar" style={styles.scrollArea}>
                    {isLoading ? (
                        <div style={styles.loadingText}>목록을 불러오는 중...</div>
                    ) : (
                        chatList.length > 0 ? (
                            chatList.map((item) => {
                                console.log(`ID: ${item.id}, Title: ${item.title}, Status:`, item.status);

                                return (
                                    <button 
                                        key={item.id} 
                                        style={styles.listItem}
                                        onClick={() => handleItemClick(item)}
                                    >
                                        <div style={styles.itemContent}>
                                            <span style={styles.itemDate}>{formatDate(item.date) || item.date}</span>
                                            <span style={styles.itemTitle}>{item.title}</span>
                                        </div>

                                        <div style={styles.itemRight}>
                                            {/* status가 FAILED(대소문자 무관)일 때만 표시 */}
                                            {(item.status?.toUpperCase() === 'FAILED' || item.status === 'failed') && (
                                                <div style={styles.failedBadge}>
                                                진행 중 이탈
                                                </div>
                                            )}
                                            <img src={rightArrowIcon} alt="상세보기" style={styles.arrowIconImg} />
                                        </div>
                                    </button>
                                );
                            })
                        ) : (
                            <div style={styles.loadingText}>대화 목록이 없습니다.</div>
                        )
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
    listItem: {
        backgroundColor: 'var(--color-text-light)',
        border: 'clamp(2px, 0.4vw, 3px) solid var(--color-text-dark)', 
        borderRadius: 'clamp(20px, 5vw, 30px)', 
        padding: 'clamp(10px, 3vw, 13px) clamp(20px, 4vw, 30px)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        cursor: 'pointer',
        width: '100%',
        height: 'clamp(60px, 7vh, 70px)',
        boxSizing: 'border-box',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        textAlign: 'left', 
    },
    itemContent: {
        display: 'flex',
        alignItems: 'center',
        gap: 'clamp(10px, 3vw, 20px)',
        fontSize: 'clamp(14px, 3vw, 20px)',
        color: 'var(--color-text-dark)',
        fontFamily: "var(--font-family-primary)",
    },
    itemDate: {
        color: 'var(--color-text-dark)',
        fontFamily: "var(--font-family-primary)",
        marginRight: 'clamp(5px, 1.5vw, 10px)',
        flexShrink: 0,
        fontWeight: '500',
    },
    itemRight: {
        display: 'flex',
        alignItems: 'center',
        gap: 'clamp(8px, 2vw, 15px)', 
    },
    failedBadge: {
        backgroundColor: 'var(--color-third)', 
        border: 'clamp(1px, 0.5vw, 2px) solid var(--color-text-dark)', 
        borderRadius: '20px',
        padding: 'clamp(0px, 0.1vh, 4px) clamp(4px, 1.5vw, 12px)',
        fontSize: 'clamp(9px, 2vw, 11px)', 
        color: 'var(--color-text-dark)', 
        fontFamily: "var(--font-family-primary)",
        whiteSpace: 'nowrap', 
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: 'clamp(10px, 3.1vh, 37px)', 
        boxSizing: 'border-box', 
        boxShadow: '0 1px 2px rgba(0,0,0,0.1)', 
    },
    arrowIconImg: {
        width: 'clamp(20px, 4vw, 28px)',
        height: 'clamp(20px, 4vw, 28px)',
        objectFit: 'contain',
    },
    loadingText: {
        textAlign: 'center',
        color: 'var(--color-text-light)',
        fontSize: 'clamp(1rem, 4vw, 1.5rem)',
        marginTop: '50px',
        fontFamily: "var(--font-family-primary)",
    },
};
export default ChatListPage;