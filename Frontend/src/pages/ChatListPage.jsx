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
        padding: '20px',
        position: 'relative',
        overflow: 'hidden',
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '15px',
        paddingTop: '5px',
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
    },
    listContainer: {
        flex: 1,
        position: 'relative',
        overflow: 'hidden', 
        marginBottom: '20px', 
    },
    scrollArea: {
        height: '100%',
        overflowY: 'auto',
        paddingRight: '10px', 
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        paddingBottom: '20px',
    },
    listItem: {
        backgroundColor: 'var(--color-text-light)',
        border: '2.3px solid var(--color-text-dark)', 
        borderRadius: '25px', 
        padding: '20px 25px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        cursor: 'pointer',
        width: '100%',
        height: '58px',
        boxSizing: 'border-box',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
    },
    itemContent: {
        display: 'flex',
        alignItems: 'center',
        gap: '20px',
        fontSize: '18px',
        color: 'var(--color-text-dark)',
        fontFamily: "var(--font-family-primary)"
    },
    itemDate: {
        color: 'var(--color-text-dark)',
        fontFamily: "var(--font-family-primary)",
        marginRight: '10px'
    },
    itemRight: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
    },
    failedBadge: {
        backgroundColor: 'var(--color-third)', 
        border: '2px solid var(--color-text-dark)', 
        borderRadius: '20px', 
        padding: '2px 10px', 
        fontSize: '12px', 
        color: 'var(--color-text-dark)', 
        fontFamily: "var(--font-family-primary)",
        whiteSpace: 'nowrap', 
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '26px', 
        boxSizing: 'border-box', 
        boxShadow: '0 1px 2px rgba(0,0,0,0.1)', 
    },
    arrowIconImg: {
        width: '24px',
        height: '24px',
        objectFit: 'contain',
    },
    loadingText: {
        textAlign: 'center',
        color: 'var(--color-text-light)',
        fontSize: '1.2rem',
        marginTop: '50px',
    },
};
export default ChatListPage;