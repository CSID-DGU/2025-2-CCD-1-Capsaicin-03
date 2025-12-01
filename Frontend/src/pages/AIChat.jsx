// src/pages/AIChat.jsx

import { useEffect, useState, useRef} from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useAudioPlayback } from '../hooks/useAudioPlayback';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { fetchStoryScene } from '../api/storyApi';
import { fetchIntroQuestion, postConversationTurn, fetchActionCard, failConversation } from '../api/chatApi';
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
    const isCompletedRef = useRef(false);

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

    useEffect(() => {
        return () => {
            // 컴포넌트 언마운트(페이지 이동, 닫기 등) 시 실행
            
            if (questionAudioRef.current) {
                console.log("페이지 이동 감지: 오디오 정지");
                questionAudioRef.current.pause();       
                questionAudioRef.current.currentTime = 0; 
                questionAudioRef.current = null;        
            }

            // 대화 중단 감지 (sessionId가 있고, 정상 종료가 아닌 경우)
            if (sessionId && !isCompletedRef.current) {
                console.log("🚫 대화 중도 이탈 감지! Failed 처리합니다.");
                failConversation(sessionId); 
            }
        };
    }, [sessionId, storyId]);

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
        // 정상 종료 여부 확인 (true면 언마운트 시 API 호출 안 함)
        isCompletedRef.current = true;
        console.log("✅ 대화 정상 종료 (Flag set to true)");

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
                            <p style={{ textAlign: 'center', margin: 0, width: '100%' }}>
                                {sceneData.text_content}
                            </p>
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
                    
                    {/* ✨ [변경 1] 상황 설명 섹션 추가 (situation_content) */}
                    <div style={styles.cardTextGroup}>
                        {/* ✨ 초록색 뱃지 타이틀 */}
                        <div style={styles.cardHeaderBadge}>어떤 상황일까?</div>
                        <p style={styles.cardTip}>{cardData.situation_content}</p>
                    </div>

                    {/* ✨ [변경 2] 행동 가이드 섹션 추가 (action_content) */}
                    <div style={styles.cardTextGroup}>
                        {/* ✨ 초록색 뱃지 타이틀 */}
                        <div style={styles.cardHeaderBadge}>같이 해볼까?</div>
                        <p style={styles.cardTip}>{cardData.action_content}</p>
                    </div>

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
        backgroundColor: 'var(--color-main)',
    },
    section: {
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        height: '100%',
    },
    
    topHomeButton: {
        position: 'absolute',
        top: '5%',
        left: '2%',
        background: 'var(--color-fourth)', 
        border: 'clamp(2px, 0.5vw, 3px) solid var(--color-text-dark)',
        borderRadius: '50%',
        width: 'clamp(30px, 8vw, 40px)',
        height: 'clamp(30px, 8vw, 40px)', 
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
        padding: 'clamp(5px, 1.4vh, 12px) clamp(7px, 2.5vw, 30px)', 
        fontSize: 'clamp(10px, 2.5vw, 18px)',  
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
        gap: '4px'
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
        overflow: 'hidden',
        backgroundColor: '#D6EAF8' // 이미지 배경색 추가
    },
    storyImage: { 
        width: '100%', 
        height: '100%', 
        objectFit: 'cover', 
    },
    introTextSection: { 
        ...baseStyles.section, 
        flex: 1, // 50%
        backgroundColor: 'var(--color-main)', 
        padding: '5% 2% 3% 5%',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'relative',
    }, 

    textContentWrapper: {
        flex: 1,
        width: '100%',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-start',
        paddingRight: '10px',
    },
    combinedText: {
        ...baseStyles.fontBase,
        fontSize: 'clamp(12px, 3vw, 18px)', 
        lineHeight: '1.6', 
        textAlign: 'center',
        whiteSpace: 'pre-line',
        wordBreak: 'keep-all',
        margin: 0,
    },
    buttonIcon: {
        height: '1.2em',
        width: '1.2em',
        objectFit: 'contain',
    },
    buttonGroup: { 
        display: 'flex', 
        gap: 'clamp(10px, 2vw, 20px)', 
        width: '100%', 
        justifyContent: 'center', 
        flexShrink: 0, 
        marginTop: '20px', 
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
        padding: '2% 3%', 
        justifyContent: 'space-between', // 말풍선과 컨트롤 영역 분리
        alignItems: 'center',
        height: '100%'
    },
    dialogueBubbleZone: {
        flex: 1,                     
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',         
        justifyContent: 'center',
        width: '100%',
        overflow: 'hidden'
    },

    dialogueControlZone: {
        height: 'auto',               
        flexShrink: 0,                
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center', 
        paddingBottom: '5%',
        gap: '10px'
    },
    chatBubble: { 
        background: 'var(--color-main)',
        padding: 'clamp(10px, 1vh, 20px) clamp(20px, 3vw, 30px)',
        borderRadius: 'clamp(15px, 10vw, 50px)',
        border: 'clamp(2px, 0.5vw, 3px) solid var(--color-text-dark)',  
        width: 'min(85%, 600px)',
        maxHeight: '70%',
        overflowY: 'auto',
        fontSize: 'clamp(12px, 2.2vw, 16px)', 
        fontFamily: 'var(--font-family-primary)', 
        lineHeight: '1.5', 
        color: 'var(--color-text-dark)',
        wordBreak: 'keep-all',
        whiteSpace: 'pre-line',
        marginTop: '2%',
        display: 'flex',             
        flexDirection: 'column',     
        alignItems: 'center',       
    },
    micButton: { 
        width: 'clamp(40px, 10vw, 70px)', 
        height: 'clamp(40px, 10vw, 70px)', 
        borderRadius: '50%', 
        border: '3px solid var(--color-text-dark)',
        backgroundColor: 'var(--color-fourth)', 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        cursor: 'pointer', 
        boxShadow: '0 4px 20px rgba(255, 160, 122, 0.5)',
        flexShrink: 0
    },
    micIcon: { 
        width: '70%',    
        height: '70%',
        objectFit: 'contain'  
    },
    dialogueGuidanceText: {
        marginTop: '0', 
        fontSize: 'clamp(10px, 2.5vw, 16px)', 
        color: 'var(--color-text-dark)', 
        fontFamily: 'var(--font-family-primary)',
        textAlign: 'center'
    },

    // --- Action Card s---
    cardContainer: { 
        ...baseStyles.baseContainer, 
        backgroundColor: 'var(--color-main)', // 배경색 (노랑)
        display: 'flex',
        flexDirection: 'row', // 가로 배치
        alignItems: 'center', 
        justifyContent: 'center',
        padding: 'clamp(20px, 5vh, 40px) clamp(20px, 5vw, 40px) clamp(10px, 5vh, 40px) clamp(40px, 10vw, 60px)',
        gap: 'clamp(20px, 5vw, 60px)', 
    },

    // 🟦 왼쪽: 파란색 카드 영역
    cardLeft: { 
        flex: 1, 
        height: 'clamp(300px, 50vh, 450px)',
        width: '100%',
        maxWidth: 'min(40%,320px)',
        maxHeight: 'min(95%,450px)',
        display: 'flex', 
        flexDirection: 'column', 
        justifyContent: 'space-between', // 이미지와 텍스트 위아래 분산
        alignItems: 'center', 
        backgroundColor: 'var(--color-second)', // 이미지와 비슷한 파란색
        border: '3px solid var(--color-text-dark)',
        borderRadius: 'clamp(15px, 2vw, 25px)', // 둥근 모서리
        padding: 'clamp(10px, 2vw, 20px)', 
        boxShadow: '0 8px 16px rgba(0,0,0,0.15)', // 부드러운 그림자
        boxSizing: 'border-box',
    },

    // 🖼️ 카드 내부 일러스트
    cardImageIllustration: {
        width: '100%', 
        height: '80%',
        objectFit: 'cover', 
        backgroundColor: 'var(--color-second)',
        borderRadius: 'clamp(10px, 1.5vw, 15px)',
        border: '2px solid rgba(0,0,0,0.05)', // 살짝 테두리
        marginBottom: '10px', // 제목과의 간격
        flexShrink: 0,
    },

    // 📝 카드 내부 제목 (1부터 10까지 세기)
    cardActionTitle: { 
        ...baseStyles.fontBase,
        height: '20%',
        fontSize: 'clamp(10px, 3.5vw, 25px)', 
        color: 'var(--color-text-dark)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        wordBreak: 'keep-all',
        margin: 0,
        flexShrink: 0,
    }, 

    // 🟩 오른쪽: 설명 및 버튼 영역
    cardRight: { 
        flex: 1.2, 
        height: '100%',
        display: 'flex', 
        flexDirection: 'column', 
        justifyContent: 'flex-start',
        alignItems: 'center',
        gap: 'clamp(2px, 4vh, 40px)',
        paddingTop: 'clamp(10px, 2vh, 20px)',
    },
    cardTextGroup: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '10px',
        width: '100%',
    },

    // 🟢 "같이 해볼까?" 버튼
    cardHeaderBadge: {
        ...baseStyles.introButtonBaseStyle, 
        backgroundColor: 'var(--color-third)', 
        color: 'var(--color-text-dark)',
        border: '3px solid var(--color-text-dark)',
        borderRadius: '50px', 
        padding: 'clamp(2px, 1.0vh, 10px) clamp(10px, 3vw, 40px)',
        fontSize: 'clamp(8px, 3vw, 17px)',
        boxShadow: '0 4px 0 rgba(0,0,0,0.2)',
    },

    // 📄 설명 텍스트
    cardTip: { 
        ...baseStyles.fontBase,
        margin: '0', 
        
        // 글자 크기 및 줄간격 반응형
        fontSize: 'clamp(16px, 2.5vw, 22px)',
        lineHeight: '1.8',
        
        color: 'var(--color-text-dark)',
        textAlign: 'center',
        wordBreak: 'keep-all',
        whiteSpace: 'pre-line',
        
        // 너무 넓게 퍼지지 않도록 제한
        maxWidth: '95%',
    }
};

export default AIChat;