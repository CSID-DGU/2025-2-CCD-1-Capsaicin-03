// src/pages/FeedbackDetailPage.jsx

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import leftArrowIcon from '../assets/left_arrow.svg';

// --- Mock Data ---
const MOCK_RESPONSE = {
    success: true,
    message: "요청이 성공적으로 처리되었습니다.",
    data: {
        id: 1,
        title: "흥부와 놀부",
        content: `처음에는 집중력이 조금 흐트러지며, 답변을 잘 못하는 모습을 보였어요.
하지만, 집중하기 시작한 후부터는 아이가 제 질문에 솔직한 감정과 함께 잘 답변했어요.

하람이는 또래에 비해 사용하는 단어가 풍부한 편이에요.
지금처럼 책을 많이 읽으면, 사고력이 또래에 비해 높아질 수 있을 거예요.

처음에는 집중력이 조금 흐트러지며, 답변을 잘 못하는 모습을 보였어요.
하지만, 집중하기 시작한 후부터는 아이가 제 질문에 솔직한 감정과 함께 잘 답변했어요.

하람이는 또래에 비해 사용하는 단어가 풍부한 편이에요.
지금처럼 책을 많이 읽으면, 사고력이 또래에 비해 높아질 수 있을 거예요.

(스크롤 테스트를 위한 추가 텍스트입니다)
아이가 동화 속 인물의 감정을 아주 잘 이해하고 있어요.
흥부가 박을 탈 때 어떤 기분이었을지 물어봤을 때 아주 창의적인 대답을 해주었답니다.
앞으로도 꾸준히 독서 지도를 해주시면 좋을 것 같아요.`
    }
};

const FeedbackDetailPage = () => {
    const { storyId } = useParams(); 
    const navigate = useNavigate();
    const [feedback, setFeedback] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchFeedbackDetail = async () => {
            setIsLoading(true);
            try {
                // 나중에 실제 API 호출로 교체
                await new Promise(resolve => setTimeout(resolve, 500));
                setFeedback(MOCK_RESPONSE.data);
            } catch (error) {
                console.error("피드백 상세 정보를 불러오는데 실패했습니다.", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchFeedbackDetail();
    }, [storyId]);

    const handleBackClick = () => {
        navigate(-1);
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
                        <span style={styles.contentTitle}>{feedback.title}의 피드백</span>
                        <p style={styles.contentText}>
                            {feedback.content}
                        </p>
                    </div>
                </div>
            </main>

            <div style={{ position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)', zIndex: 10 }}>
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
    },
    contentTitle: {
        fontSize: '1.3rem',
        color: 'var(--color-text-dark)'
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