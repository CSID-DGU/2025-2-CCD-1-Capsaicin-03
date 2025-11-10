// src/pages/AIChat.jsx
import React, { useEffect, useState, useRef} from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useAudioPlayback } from '../hooks/useAudioPlayback';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { fetchStoryScene } from '../api/storyApi';
import { fetchIntroQuestion, fetchActionCard } from '../api/chatApi';
import homeIcon from '../assets/home_icon.svg';
import micBlackIcon from '../assets/Mic_black.svg';
import micIcon from '../assets/mic.svg';
import playBackIcon from '../assets/Playback.svg';

const AIChat = () => {
    const { storyId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const questionAudioRef = useRef(null);
    const [chatStep, setChatStep] = useState('intro'); 
    const [sceneData, setSceneData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isFetchingQuestion, setIsFetchingQuestion] = useState(false);
    const [cardData, setCardData] = useState(null);
    const [isResponding, setIsResponding] = useState(false);
    const [isAIAudioPlaying, setIsAIAudioPlaying] = useState(false);

    useEffect(() => {
        if (location.pathname.includes('/intro')) setChatStep('intro');
        else if (location.pathname.includes('/dialogue')) setChatStep('dialogue');
        else if (location.pathname.includes('/card')) setChatStep('card');
    }, [location.pathname]);
    
    useEffect(() => {
        if (!storyId) {
            setLoading(false);
            setError(new Error("Story ID가 없습니다."));
            return;
        }

        const loadScene = async () => {
            setLoading(true);
            try {
                const data = await fetchStoryScene(storyId);
                setSceneData(data); 
                setError(null);
            } catch (err) {
                console.error("장면 로딩 실패:", err);
                setError(err); 
            } finally {
                setLoading(false); 
            }
        };

        if (chatStep === 'intro') {
            loadScene();
        }

    }, [storyId, chatStep]);
    
    useEffect(() => {
        if (chatStep === 'card' && storyId && !cardData) {
            
            const loadActionCard = async () => {
                setLoading(true);
                setError(null);
                try {
                    const data = await fetchActionCard(storyId);
                    setCardData(data); 
                } catch (err) {
                    console.error("행동 카드 로딩 실패:", err);
                    setError(err); 
                } finally {
                    setLoading(false);
                }
            };
            
            loadActionCard();
        }
    }, [chatStep, storyId, cardData]);

    const { handleReplay } = useAudioPlayback(
        sceneData?.audio_url, 
        chatStep === 'intro' 
    );
    
    const { 
        isRecording, 
        recordedAudioURL, 
        startRecording,  
        stopRecording    
    } = useAudioRecorder({
        // 나중에 API 연동 시 여기에 handleRecordingComplete 함수를 전달
        onStop: (audioBlob, audioUrl) => {
             console.log("훅에서 녹음 완료:", audioUrl);
        }
    });
    const startChat = async () => {
        if (isFetchingQuestion) return; 
        setIsFetchingQuestion(true); 
        setError(null); 
        
        try {
            const questionData = await fetchIntroQuestion(storyId);
            const questionAudio = new Audio(questionData.audio_url);

            setIsAIAudioPlaying(true);
            questionAudio.onended = () => {
                setIsAIAudioPlaying(false);
            };
            questionAudio.play().catch(e => {
                console.error("오디오 재생 실패:", e);
                setIsAIAudioPlaying(false); 
            });
            questionAudioRef.current = questionAudio;
            setSceneData(questionData);
            navigate(`/chat/${storyId}/dialogue`);

        } catch (err) {
            console.error("첫 질문 로딩 실패:", err);
            setError(err); 
        } finally {
            setIsFetchingQuestion(false); 
        }
    };
    const finishChat = () => {
            if (questionAudioRef.current) {
            questionAudioRef.current.pause();
            questionAudioRef.current.src = ""; 
            questionAudioRef.current = null;
        }
        navigate(`/chat/${storyId}/card`);
    };
    const TopHomeButton = () => (
        <button onClick={() => navigate('/stories')} style={styles.topHomeButton}>
            <img src={homeIcon} alt="홈으로" style={styles.homeIcon} />
        </button>
    );
    
    if (loading) {
        return <div style={{ padding: '20px', ...styles.fontBase }}>
            {chatStep === 'card' ? '행동 카드를 불러오는 중입니다...' : '장면을 불러오는 중입니다...'}
        </div>;
    }

    if (error) {
        return <div style={{ padding: '20px', ...styles.fontBase }}>오류: {error.message}</div>;
    }

    if ((chatStep === 'intro' || chatStep === 'dialogue') && !sceneData) {
        return <div style={{ padding: '20px', ...styles.fontBase }}>장면 데이터가 없습니다.</div>;
    }

    // -------------------------  AI 대화 인트로 -------------------------
    if (chatStep === 'intro') {
        return (
            <div style={styles.introContainer}>
                <TopHomeButton />
                <div style={styles.introImageSection}>
                    <img src={sceneData.img_url} alt="동화 속 장면" style={styles.storyImage} />
                </div>
                
                <div style={styles.introTextSection}>
                    <div style={styles.textContentWrapper}>
                        <p style={{ ...styles.combinedText, whiteSpace: 'pre-line' }}>
                            {sceneData.text_content}
                        </p>
                    </div>
                    
                    <div style={styles.buttonGroup}>           
                        <button onClick={handleReplay} style={styles.introSecondaryButton}>
                            <img src={playBackIcon} alt="다시 듣기" style={styles.buttonIcon} />
                            <span>다시 듣기</span>
                        </button>
                        <button onClick={startChat} style={styles.introPrimaryButton} disabled={isFetchingQuestion}>
                            <img src={micBlackIcon} alt="대화하기" style={styles.buttonIcon} />
                            <span>{isFetchingQuestion ? '준비중...' : '대화하기'}</span>
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // -------------------------  AI 대화 -------------------------
    if (chatStep === 'dialogue') {
        const isMicDisabled = isResponding || isAIAudioPlaying;
        return (
            <div style={styles.dialogueContainer}>
                <TopHomeButton />
                <div style={styles.dialogueImageSection}>
                    <img src={sceneData.img_url} alt="대화 캐릭터" style={styles.dialogueStoryImage} />
                </div>
                <div style={styles.dialogueTextSection}>
                    <div style={styles.chatBubble}>
                        <p>{sceneData.text_content}</p>
                    </div>
                    <button 
                        style={{
                            ...styles.micButton,
                            backgroundColor: isMicDisabled ? '#AAAAAA' : 'var(--color-fourth)',
                            cursor: isMicDisabled ? 'not-allowed' : 'pointer',
                        }}
                        onMouseDown={startRecording} //웹
                        onMouseUp={stopRecording}    
                        onTouchStart={startRecording} //모바일
                        onTouchEnd={stopRecording}  
                        disabled={isMicDisabled}
                    >
                        <img src={micIcon} alt ="마이크" style={styles.micIcon} />
                    </button>
                    <p style={styles.dialogueGuidanceText}>
                        {isAIAudioPlaying ? 'AI가 이야기 중이에요. 조금만 기다려줘!' :
                         (isRecording ? '듣고 있어요...' : '마이크를 눌러 대답해줘!')}
                    </p>
                    {recordedAudioURL && (
                    <div style={{marginTop: '10px'}}>
                        <audio src={recordedAudioURL} controls autoPlay />
                    </div>
                    )}
                    <button onClick={finishChat} style={styles.tempButton}>대화 마치기</button>
                </div>
            </div>
        );
    }

   // -------------------------  행동카드 -------------------------
    if (chatStep === 'card') {
        if (!cardData) {
            return <div style={{ padding: '20px', ...styles.fontBase }}>행동 카드 데이터가 없습니다.</div>;
        }

        return (
            <div style={styles.cardContainer}>
                <TopHomeButton />
                
                <div style={styles.cardLeft}>
                    <img 
                        src={cardData.img_url} 
                        alt="행동카드 일러스트" 
                        style={styles.cardImageIllustration} 
                    />
                    <p style={styles.cardActionTitle}>{cardData.title}</p>
                </div>

                <div style={styles.cardRight}>
                    <button style={styles.cardHeaderButton}>같이 해볼까?</button>
                    <p style={{ ...styles.cardTip, whiteSpace: 'pre-line' }}>
                        {cardData.content} 
                    </p>
                </div>
            </div>
        );
    }

    return null;
};

// --- Styles ---
const baseStyles = {
    baseContainer: {
        display: 'flex',
        height: '100%', 
        width: '100%',
        boxSizing: 'border-box',
        overflow: 'hidden',
        position: 'relative',
        fontFamily: 'var(--font-family-primary)',
        borderRadius: '10px',
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)',
    },
    section: {
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
    },
    dialogueStoryImage: { 
        width: '100%', 
        height: '100%', 
        objectFit: 'cover', 
    },
    
    topHomeButton: {
        position: 'absolute',
        top: '20px',
        left: '15px',
        background: 'var(--color-fourth)', 
        border: '3px solid var(--color-text-dark)',
        borderRadius: '50%',
        width: '40px',
        height: '40px', 
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        zIndex: 100,
        padding: 0,
        boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
    },

    homeIcon: {
        width: '60%',
        height: '60%',
        objectFit: 'contain',
    },

    fontBase: {
        fontFamily: 'var(--font-family-primary)',
        color: 'var(--color-text-dark, #4F4F4F)',
    },
    introButtonBaseStyle: { 
        padding: '11px 20px', 
        fontSize: '1.1rem',  
        fontFamily: 'var(--font-family-primary)', 
        border: '3px solid var(--color-text-dark)', 
        borderRadius: '25px',
        cursor: 'pointer', 
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        textAlign: 'center',
        whiteSpace: 'nowrap',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '5px'
    },
};

const styles = {
    ...baseStyles,
    
    introContainer: { ...baseStyles.baseContainer},
    introImageSection: { 
        ...baseStyles.section, 
        flex: 1, 
        padding: '0', 
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden' 
    },
    storyImage: { 
        width: '100%', 
        height: '100%', 
        objectFit: 'cover', 
    },
    introTextSection: { 
        ...baseStyles.section, 
        flex: 1, 
        backgroundColor: 'var(--color-main)', 
        padding: '20px', 
        justifyContent: 'flex-start',
        height: '100%',
        alignItems: 'center',
        wordBreak: 'keep-all'
    }, 

    textContentWrapper: {
        width: '100%',
        overflowY: 'auto', 
        paddingTop: '20px', 
    },
    combinedText: {
        ...baseStyles.fontBase,
        fontSize: '1.1rem', 
        lineHeight: '1.6', 
        textAlign: 'left',
    },
    buttonIcon: {
        height: '1.0em',
        width: '1.0em',
        objectFit: 'contain',
    },
    buttonGroup: { 
        display: 'flex', 
        gap: '10px', 
        width: '100%', 
        justifyContent: 'center', 
        flexShrink: 0, 
        marginTop: '15px', 
    },
    introPrimaryButton: { 
        ...baseStyles.introButtonBaseStyle,
        backgroundColor: 'var(--color-fourth)',
        color: 'var(--color-text-dark)'
    },
    introSecondaryButton: { 
        ...baseStyles.introButtonBaseStyle,
        backgroundColor: 'var(--color-third)',
        color: 'var(--color-text-dark)', 
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
    },
    
    dialogueContainer: { ...baseStyles.baseContainer, backgroundColor: 'var(--color-main)' },
    dialogueImageSection: { 
        ...baseStyles.section, 
        flex: 1,
        padding: '0', 
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    
    dialogueTextSection: { 
        ...baseStyles.section, 
        flex: 1, 
        backgroundColor: 'var(--color-main)', 
        padding: '20px', 
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    chatBubble: { 
        background: 'var(--color-main)',
        padding: '3px 15px', 
        borderRadius: '50px',
        border: '3px solid var(--color-text-dark)',        
        maxWidth: '100%', 
        marginTop: '10px',
        marginBottom: '20px', 
        fontSize: '1.0rem', 
        fontFamily: 'var(--font-family-primary)', 
        lineHeight: '1.6', 
        color: 'var(--color-text-dark)',
        wordBreak: 'keep-all'
    },
    micButton: { 
        width: '70px', 
        height: '70px', 
        borderRadius: '50%', 
        border: '3px solid var(--color-text-dark)',
        backgroundColor: 'var(--color-fourth)', 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        cursor: 'pointer', 
        boxShadow: '0 4px 20px rgba(255, 160, 122, 0.5)',
    },
    micIcon: { 
        width: '80%',    
        height: '80%'
    },
    dialogueGuidanceText: {
        marginTop: '10px', 
        fontSize: '0.9rem', 
        color: 'var(--color-text-dark)', 
        fontFamily: 'var(--font-family-primary)'
    },
    tempButton: {
        ...baseStyles.introButtonBaseStyle, 
        padding: '10px 20px', 
        fontSize: '1rem',
        backgroundColor: 'var(--color-third)', 
        color: 'var(--color-text-light)',
        marginTop: '0px', 
        border: '3px solid var(--color-text-dark)'
    },

    // --- Action Card  ---
    cardContainer: { 
        ...baseStyles.baseContainer, 
        backgroundColor: 'var(--color-main)',
        alignItems: 'center', 
        justifyContent: 'center',
        flexDirection: 'row', 
        padding: '50px', 
        gap: '30px', 
    },

    cardLeft: { 
        flex: 1, 
        height: '100%',
        padding: '10px', 
        display: 'flex', 
        flexDirection: 'column', 
        justifyContent: 'space-evenly', 
        alignItems: 'center', 
        gap: '0px', 
        border: '3px solid var(--color-text-dark)',
        borderRadius: '15px',
        backgroundColor: 'var(--color-second)',
        boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
        overflow: 'hidden',
        marginLeft: '10px'
    },
    cardImageIllustration: {
        width: '95%', 
        height: '100%', 
        objectFit: 'contain',
        borderRadius: '10px'
    },
    cardActionTitle: { 
        ...baseStyles.fontBase,
        fontSize: '1.5rem', 
        color: 'var(--color-text-dark)',
        textAlign: 'center',
    }, 

    cardRight: { 
        flex: 1.3, 
        height: '100%', 
        padding: '30px 10px',
        display: 'flex', 
        flexDirection: 'column', 
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: '10px'
    },
    cardHeaderButton: {
        ...baseStyles.introButtonBaseStyle, 
        backgroundColor: 'var(--color-third)',
        color: 'var(--color-text-dark)',
        borderRadius: '30px',
        border: '3px solid var(--color-text-dark)',
        padding: '10px 30px',
        fontSize: '1.3rem',
        marginBottom: '25px'
    },
    cardTip: { 
        ...baseStyles.fontBase,
        padding: '5px', 
        margin: '0', 
        fontSize: '1.2rem',
        lineHeight: '1.5',
        color: 'var(--color-text-dark)',
        textAlign: 'center',
        wordBreak: 'keep-all'
    }
};

export default AIChat;
// Test comment to trigger workflow