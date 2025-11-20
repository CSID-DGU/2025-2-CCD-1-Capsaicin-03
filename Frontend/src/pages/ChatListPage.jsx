// src/pages/ChatListPage.jsx

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import leftArrowIcon from '../assets/left_arrow.svg';
import rightArrowIcon from '../assets/right_arrow.svg';

// --- Mock Data ---
const MOCK_CHAT_LIST = [
    { id: 1, date: '25/10/01', title: '흥부와 놀부' },
    { id: 2, date: '25/09/28', title: '콩쥐팥쥐' },
    { id: 3, date: '25/08/26', title: '가난한 유산' },
    { id: 4, date: '25/08/26', title: '가난한 유산 (2회차)' },
    { id: 5, date: '25/08/20', title: '해와 달이 된 오누이' },
    { id: 6, date: '25/08/15', title: '토끼와 거북이' },
    { id: 7, date: '25/08/10', title: '선녀와 나무꾼' },
];

const ChatListPage = () => {
    const navigate = useNavigate();
    const [chatList, setChatList] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchList = async () => {
            setIsLoading(true);
            try {
                // 나중에 실제 대화 목록 API 호출로 교체
                await new Promise(resolve => setTimeout(resolve, 500));
                setChatList(MOCK_CHAT_LIST);
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

    const handleItemClick = (id) => {
        navigate(`/parents/chat/${id}`);
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
                            width: 12px;
                        }
                        .custom-scrollbar::-webkit-scrollbar-track {
                            background: var(--color-text-light); 
                            border : 1.7px solid var(--color-text-dark);
                            border-radius: 10px;
                            margin: 10px 0;
                        }
                        .custom-scrollbar::-webkit-scrollbar-thumb {
                            background: var(--color-main);
                            border-radius: 10px;
                            background-clip: padding-box;
                            border: 3.5px solid transparent;
                        }
                    `}
                </style>

                <div className="custom-scrollbar" style={styles.scrollArea}>
                    {isLoading ? (
                        <div style={styles.loadingText}>목록을 불러오는 중...</div>
                    ) : (
                        chatList.map((item) => (
                            <button 
                                key={item.id} 
                                style={styles.listItem}
                                onClick={() => handleItemClick(item.id)}
                            >
                                <div style={styles.itemContent}>
                                    <span style={styles.itemDate}>{item.date}</span>
                                    <span style={styles.itemTitle}>{item.title}</span>
                                </div>
                                <img src={rightArrowIcon} alt="상세보기" style={styles.arrowIconImg} />
                            </button>
                        ))
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
        alignItems: 'center', 
        gap: '12px', 
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
        maxWidth: '732px',
        
        height: '58px',
        boxSizing: 'border-box',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        flexShrink: 0,
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

export default ChatListPage;