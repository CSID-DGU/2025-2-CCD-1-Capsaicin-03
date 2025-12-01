// src/pages/FeedbackListPage.jsx

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import leftArrowIcon from '../assets/left_arrow.svg';
import rightArrowIcon from '../assets/right_arrow.svg';
import { getFeedbackList } from '../api/parentsApi';
import warningIcon from '../assets/warning_dark.svg'; 

const FeedbackListPage = () => {
    const navigate = useNavigate();
    const [feedbackList, setFeedbackList] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchList = async () => {
            setIsLoading(true);
            try {
                const response = await getFeedbackList();
                
                console.log("✅ 피드백 목록 응답:", response);
                console.log("📂 [데이터 확인] response.data:", response?.data);

                if (response && response.success) {
                    setFeedbackList(response.data);
                } else {
                    console.error("데이터를 불러오지 못했습니다:", response?.message);
                }
            } catch (error) {
                console.error("피드백 목록을 불러오는데 실패했습니다.", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchList();
    }, []);

    const handleBackClick = () => {
        navigate(-1); 
    };

    const handleItemClick = (id) => {
        navigate(`/parents/feedback/${id}`);
    };

    const formatDate = (dateString) => {
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
                    <span style={styles.pageTitle}>피드백 목록</span>
                </div>
            </header>

            <main style={styles.listContainer}>
                <div className="custom-scrollbar" style={styles.scrollArea}>
                    {isLoading ? (
                        <div style={styles.loadingText}>목록을 불러오는 중...</div>
                    ) : feedbackList.length === 0 ? (
                            <div style={styles.emptyContainer}>
                            <img src={warningIcon} alt="알림" style={styles.warningIcon} />
                            <p style={styles.emptyText}>
                                아동의 답변이 충분하지 않아<br />
                                피드백이 제공되지 않아요
                            </p>
                        </div>
                    ) : (
                        feedbackList.map((item) => (
                            <button 
                                key={item.id} 
                                style={styles.listItem}
                                onClick={() => handleItemClick(item.id)}
                            >
                                <div style={styles.itemContent}>
                                    <span style={styles.itemDate}>{formatDate(item.date) || item.date}</span>
                                    <span style={styles.itemTitle}>{item.title}</span>
                                </div>
                                <img src={rightArrowIcon} alt="상세보기" style={styles.arrowIconImg} />
                            </button>
                        ))
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

    emptyContainer: {
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100%', 
        textAlign: 'center',
        color: 'var(--color-text-dark)',
        opacity: 0.8,
    },
    warningIcon: {
        width: 'clamp(30px, 8vw, 50px)',
        height: 'clamp(30px, 8vw, 50px',
        marginBottom: 'clamp(15px, 3vh, 25px)', 
        objectFit: 'contain',
    },
    emptyText: {
        fontSize: 'clamp(0.9rem, 3.0vw, 1.2rem)', 
        lineHeight: '1.6', 
        fontFamily: "var(--font-family-primary)",
        margin: 0,
        whiteSpace: 'pre-line',
    },
};

export default FeedbackListPage;