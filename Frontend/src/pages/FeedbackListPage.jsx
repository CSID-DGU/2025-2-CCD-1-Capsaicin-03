// src/pages/FeedbackListPage.jsx

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import leftArrowIcon from '../assets/left_arrow.svg';
import rightArrowIcon from '../assets/right_arrow.svg';
import { getFeedbackList } from '../api/parentsApi';

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

export default FeedbackListPage;