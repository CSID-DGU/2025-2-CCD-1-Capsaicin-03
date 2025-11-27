// src/pages/AIChat.jsx

import { useEffect, useState, useRef} from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useAudioPlayback } from '../hooks/useAudioPlayback';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { fetchStoryScene } from '../api/storyApi';
import { fetchIntroQuestion, postConversationTurn, fetchActionCard } from '../api/chatApi';
import { getChildProfile } from '../api/profileApi';
import ReactGA from 'react-ga4';
import homeIcon from '../assets/home_icon.svg';
import micBlackIcon from '../assets/Mic_black.svg';
import micIcon from '../assets/mic.svg';
import playBackIcon from '../assets/Playback.svg';

const AIChat = () => {
    const { storyId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    const questionAudioRef = useRef(null);
    const recordingStartTime = useRef(0);

    const [chatStep, setChatStep] = useState('intro'); 
    const [sceneData, setSceneData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [isFetchingQuestion, setIsFetchingQuestion] = useState(false);
    const [isResponding, setIsResponding] = useState(false);
    const [isAIAudioPlaying, setIsAIAudioPlaying] = useState(false);

    const [cardData, setCardData] = useState(null);

    const [childId, setChildId] = useState(null);     
    const [sessionId, setSessionId] = useState('');   
    const [currentStage, setCurrentStage] = useState('S1');

    useEffect(() => {
        if (chatStep === 'dialogue' && currentStage) {
            // 'S1' -> 1 로 변환
            const stepNum = parseInt(currentStage.replace('S', '')) || 1;
            
            ReactGA.event({
                category: "Chat",
                action: "dialog_step_progress",
                label: `${stepNum}단계 진입`,
                story_id: storyId,
                step_number: stepNum
            });
            console.log(`[Analytics] dialog_step_progress (step: ${stepNum})`);
        }
    }, [chatStep, currentStage, storyId]);

    useEffect(() => {
        if (chatStep === 'card') {
            ReactGA.event({
                category: "Chat",
                action: "actioncard_reach",
                label: "행동 카드 도달",
                story_id: storyId
            });
            console.log("[Analytics] actioncard_reach");
        }
    }, [chatStep, storyId]);

    useEffect(() => {
        if (location.pathname.includes('/intro')) setChatStep('intro');
        else if (location.pathname.includes('/dialogue')) setChatStep('dialogue');
        else if (location.pathname.includes('/card')) setChatStep('card');
    }, [location.pathname]);
    
    useEffect(() => {
        const loadChildData = async () => {
            try {
                const response = await getChildProfile();
                
                if (response.success && response.data && response.data.id) {
                    console.log("👶 Child ID Loaded:", response.data.id);
                    setChildId(response.data.id);
                } else {
                    console.warn("아이 정보를 찾을 수 없습니다.");
                }
            } catch (err) {
                console.error("아이 정보를 불러오지 못했습니다.", err);
            }
        };
        loadChildData();
    }, []);

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

    //컴포넌트 이동 시 오디오 정지 로직 추가
    useEffect(() => {
        return () => {
            if (questionAudioRef.current) {
                console.log("페이지 이동 감지: 오디오 정지");
                questionAudioRef.current.pause();       // 오디오 일시정지
                questionAudioRef.current.currentTime = 0; // 재생 위치 초기화
                questionAudioRef.current = null;        
            }
        };
    }, []);

    const { handleReplay } = useAudioPlayback(
        sceneData?.audio_url, 
        chatStep === 'intro' 
    );
    
    const handleRecordingComplete = async (audioBlob, audioUrl) => {
        if (!sessionId) {
            console.error("세션 ID가 없습니다. 처음부터 다시 시작해주세요.");
            return;
        }
        if (!childId) {
            alert("아이 정보를 불러오는 중입니다. 잠시 후 다시 시도해주세요.");
            return;
        }

        setIsResponding(true); 

        try {
            const response = await postConversationTurn({
                storyId,
                childId,     
                sessionId,   
                stage: currentStage,
                audioBlob
            });

            console.log("🤖 AI 응답 수신:", response);

            if (response.ai_text) {
                setSceneData(prev => ({
                    ...prev,
                    text_content: response.ai_text
                }));
            }
            
            if (response.next_stage) {
                setCurrentStage(response.next_stage);
            }

            if (response.tts_audio_url) {
                const aiAudio = new Audio(response.tts_audio_url);
                questionAudioRef.current = aiAudio;

                setIsAIAudioPlaying(true);
                
                aiAudio.onended = () => {
                    setIsAIAudioPlaying(false);
                    if (response.is_end) {
                        finishChat(); 
                    }
                };

                await aiAudio.play();
            } else {
                setIsResponding(false); 
                if (response.is_end) {
                    finishChat();
                }
            }

        } catch (err) {
            console.error("대화 처리 중 오류:", err);
            alert("마이크를 다시 한번 꾹 누른 채로 대답해 주세요.");
        } finally {
            setIsResponding(false); 
        }
    };

    const { 
        isRecording, 
        recordedAudioURL, 
        startRecording,  
        stopRecording    
    } = useAudioRecorder({
        onStop: (audioBlob, audioUrl) => {
            console.log("🎤 녹음 완료, API 전송 시작");
            
            const duration = Date.now() - recordingStartTime.current; 
            const stepNum = parseInt(currentStage.replace('S', '')) || 1;

            ReactGA.event({
                category: "Chat",
                action: "dialog_answer",
                label: `답변 완료 (${duration}ms)`,
                story_id: storyId,
                step_number: stepNum,
                answer_duration: duration 
            });
            console.log(`[Analytics] dialog_answer (duration: ${duration}ms)`);

            handleRecordingComplete(audioBlob, audioUrl);
        }
    });

    const handleStartRecording = () => {
        recordingStartTime.current = Date.now(); // 시간 기록
        startRecording(); // 실제 녹음 시작
    };

    const startChat = async () => {
        if (isFetchingQuestion) return; 
        setIsFetchingQuestion(true); 
        setError(null); 
        
        try {
            const questionData = await fetchIntroQuestion(storyId);
            
            if (questionData.session_id) {
                console.log("✅ 세션 시작, ID:", questionData.session_id);
                setSessionId(questionData.session_id);
            } else {
                console.warn("⚠️ 경고: Intro API 응답에 session_id가 없습니다.");
            }
            
            if (questionData.current_stage) {
                setCurrentStage(questionData.current_stage);
            }

            const questionAudio = new Audio(questionData.audio_url);
            questionAudioRef.current = questionAudio;

            setIsAIAudioPlaying(true);
            questionAudio.onended = () => {
                setIsAIAudioPlaying(false);
            };
            
            await questionAudio.play().catch(e => {
                console.error("오디오 재생 실패:", e);
                setIsAIAudioPlaying(false); 
            });
            
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
    
    if (loading && chatStep !== 'dialogue') { 
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
                    <style>
                        {`
                            .hide-scrollbar::-webkit-scrollbar {
                                display: none; /* Webkit */
                            }
                        `}
                    </style>
                    <div className="hide-scrollbar" style={styles.textContentWrapper}> {/* 클래스 이름 변경 및 적용 */}
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
                <div style={styles.dialogueTextSection}>
                    <style>
                        {`
                            .hide-scrollbar::-webkit-scrollbar {
                                display: none;
                            }
                        `}
                    </style>

                    <div style={styles.dialogueBubbleZone}>
                        <div className="hide-scrollbar" style={styles.chatBubble}>
                            <p>{sceneData.text_content}</p>
                        </div>
                    </div>
                    
                    <div style={styles.dialogueControlZone}>
                        <button 
                            style={{
                                ...styles.micButton,
                                backgroundColor: isMicDisabled ? '#AAAAAA' : 'var(--color-fourth)',
                                cursor: isMicDisabled ? 'not-allowed' : 'pointer',
                                transform: isRecording ? 'scale(1.1)' : 'scale(1)',
                                transition: 'all 0.2s ease'
                            }}
                            onMouseDown={handleStartRecording} 
                            onMouseUp={stopRecording}    
                            onTouchStart={(e) => {
                                e.preventDefault();
                                e.stopPropagation();  
                                handleStartRecording();
                            }}
                            onTouchEnd={(e) => {  
                                e.preventDefault();  
                                e.stopPropagation();  
                                stopRecording();
                            }}
                            onTouchMove={(e) => {  
                                e.preventDefault();
                                e.stopPropagation();
                            }}
                            onContextMenu={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                return false;
                            }}
                            disabled={isMicDisabled}
                        >
                            <img 
                                src={micIcon} 
                                alt="마이크" 
                                style={styles.micIcon}
                                draggable="false"
                                onDragStart={(e) => e.preventDefault()}  
                                onContextMenu={(e) => e.preventDefault()}  
                                onTouchStart={(e) => e.preventDefault()}  
                                onTouchEnd={(e) => e.preventDefault()}  
                                onTouchMove={(e) => e.preventDefault()}  
                            />
                        </button>
                        
                        <p style={styles.dialogueGuidanceText}>
                            {isResponding ? 'AI가 대답을 생각하고 있어요...' : 
                             (isAIAudioPlaying ? 'AI가 이야기 중이에요. 잘 들어보세요!' :
                              (isRecording ? '듣고 있어요...' : '마이크를 눌러 대답해줘!'))}
                        </p>
                    </div>
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
        padding: '20px 20px 25px 20px', 
        justifyContent: 'center',
        height: '100%',
        alignItems: 'center',
        wordBreak: 'keep-all'
    }, 

    textContentWrapper: {
        flex: 1,
        width: '100%',
        overflowY: 'auto',
        '-msOverflowStyle': 'none', 
        'scrollbarWidth': 'none'
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
    dialogueTextSection: { 
        ...baseStyles.section, 
        flex: 1, 
        backgroundColor: 'var(--color-main)',
        padding: '20px', 
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        height: '100%'
    },
    dialogueBubbleZone: {
        flex: 1,                     
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',         
        justifyContent: 'flex-start',
        overflow: 'auto',           
        width: '100%',
        paddingTop: '60px',
        paddingBottom: '10px',
        overflow: 'hidden'
    },

    dialogueControlZone: {
        height: '120px',              
        flexShrink: 0,                
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start', 
        paddingTop: '10px',
    },
    chatBubble: { 
        background: 'var(--color-main)',
        padding: '5px 20px', 
        borderRadius: '50px',
        border: '3px solid var(--color-text-dark)',        
        maxWidth: '95%',
        maxHeight: '125px',
        overflowY: 'auto',
        fontSize: '1.0rem', 
        fontFamily: 'var(--font-family-primary)', 
        lineHeight: '1.6', 
        color: 'var(--color-text-dark)',
        wordBreak: 'keep-all',
        whiteSpace: 'pre-line',
        '-msOverflowStyle': 'none', 
        'scrollbarWidth': 'none'
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
        touchAction: 'none',         
        userSelect: 'none',          
        WebkitUserSelect: 'none',    
        WebkitTouchCallout: 'none',
        WebkitUserDrag: 'none',
        flexShrink: 0
    },
    micIcon: { 
        width: '80%',    
        height: '80%',
        pointerEvents: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none',  
        WebkitUserDrag: 'none',  
        objectFit: 'contain'  
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