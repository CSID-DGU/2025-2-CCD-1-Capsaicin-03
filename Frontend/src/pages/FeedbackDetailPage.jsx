// src/pages/FeedbackDetailPage.jsx

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import leftArrowIcon from '../assets/left_arrow.svg';
import { getFeedbackDetail } from '../api/parentsApi';

const FeedbackDetailPage = () => {
    const { conversationId } = useParams();
    const navigate = useNavigate();
    const [feedback, setFeedback] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchFeedbackDetail = async () => {
            if (!conversationId) return;

            setIsLoading(true);
            try {
                const response = await getFeedbackDetail(conversationId);

                console.log("✅ 피드백 상세 응답:", response);

                if (response && response.success) {
                    setFeedback(response.data);
                } else {
                    console.error("데이터 로드 실패:", response?.message);
                }
            } catch (error) {
                console.error("피드백 상세 정보를 불러오는데 실패했습니다.", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchFeedbackDetail();
    }, [conversationId]);

    const handleBackClick = () => {
        navigate(-1);
    };

    const cleanText = (text) => {
        if (!text) return "";
        return text.replace(/```[a-z]*\n?/gi, '').replace(/```/g, '').trim();
    };

    if (isLoading) {
        return <div style={styles.container}><div style={styles.loadingText}>피드백을 불러오는 중...</div></div>;
    }

    if (!feedback) {
        return <div style={styles.container}><div style={styles.loadingText}>피드백 정보가 없습니다.</div></div>;
    }

    return (
        <div style={styles.container}>
            <header style={styles.header}>
                <div style={styles.headerLeft}>
                    <button onClick={handleBackClick} style={styles.backButton}>
                        <img src={leftArrowIcon} alt="뒤로가기" style={styles.backIconImg} />
                    </button>
                    <span style={styles.pageTitle}>&lt;{feedback.title}&gt; 피드백</span>
                </div>
            </header>

            <main className="custom-scrollbar" style={styles.contentWrapper}>
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

                <div style={styles.whiteBox}>
                    <div style={styles.scrollContent}>
                        {/* 대화 피드백 섹션 */}
                        <div style={styles.section}>
                            <span style={styles.subTitle}>💡 대화 피드백</span>
                            <p style={styles.contentText}>
                                {cleanText(feedback.conversation_feedback)}
                            </p>
                        </div>

                        <div style={styles.divider}></div>

                        {/* 행동 가이드 섹션 */}
                        <div style={styles.section}>
                            <span style={styles.subTitle}>🌱 지도 방향</span>
                            <p style={styles.contentText}>
                                {cleanText(feedback.action_guide)}
                            </p>
                        </div>
                    </div>
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

    contentWrapper: {
        flex: 1,
        width: '100%',
        maxWidth: '760px', 
        margin: '0 auto',
        position: 'relative',
        overflowY: 'auto', 
        paddingRight: '10px', 
        paddingBottom: '40px', 
        display: 'flex',    
        justifyContent: 'center',
    },

    whiteBox: {
        backgroundColor: 'var(--color-text-light)',
        width: '732px',
        height: 'fit-content', 
        borderRadius: '30px', 
        border: '2px solid var(--color-text-dark)',
        boxSizing: 'border-box',
        boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
        marginBottom: '10px', 
    },

    scrollContent: {
        padding: '30px',
        display: 'flex',
        flexDirection: 'column',
        gap: '15px',
    },

    section: {
        display: 'flex',
        flexDirection: 'column'
    },

    subTitle: {
        fontSize: '1.2rem',
        color: 'var(--color-fourth)',
        fontFamily: "var(--font-family-primary)",
    },

    divider: {
        width: '100%',
        height: '2px',
        backgroundColor: '#eee', 
        borderTop: '2px dashed var(--color-text-dark)', 
    },
    contentText: {
        fontSize: '18px',
        lineHeight: '1.6', 
        color: 'var(--color-text-dark)',
        whiteSpace: 'pre-wrap',
        fontFamily: "var(--font-family-primary)",
        wordBreak: 'keep-all', 
    },
    loadingText: {
        textAlign: 'center',
        color: 'var(--color-text-light)',
        fontSize: '1.2rem',
        marginTop: '50px',
    },
};

export default FeedbackDetailPage;