import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getChildProfile, updateChildProfile } from '../api/profileApi';
import leftArrowIcon from '../assets/left_arrow.svg'; 

const EditChildPage = () => {
    const navigate = useNavigate();
    const [name, setName] = useState('');
    const [birthYear, setBirthYear] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const fetchChildInfo = async () => {
            setIsLoading(true);
            try {
                const response = await getChildProfile();
                
                if (response.success && response.data) {
                    const { name, birth_year, birthYear: birthYearCamel } = response.data;
                    
                    setName(name);
                    const yearValue = birth_year || birthYearCamel;
                    setBirthYear(String(yearValue)); 
                }
            } catch (error) {
                console.error("아이 정보를 불러오는데 실패했습니다.", error);
                alert("정보를 불러올 수 없습니다.");
                navigate(-1); 
            } finally {
                setIsLoading(false);
            }
        };

        fetchChildInfo();
    }, [navigate]);

    const handleBackClick = () => {
        navigate(-1);
    };

    const handleYearChange = (e) => {
        const value = e.target.value.replace(/\D/g, '');
        if (value.length <= 4) {
            setBirthYear(value);
        }
    };

    const handleSave = async () => {
        if (!name.trim()) {
            alert("아이 이름을 입력해주세요.");
            return;
        }
        if (birthYear.length !== 4) {
            alert("태어난 해 4자리를 정확히 입력해주세요. (예: 2019)");
            return;
        }

        setIsSaving(true);
        try {
            const response = await updateChildProfile({ name, birthYear });

            if (response.success) {
                alert("아이 정보가 수정되었습니다.");
                navigate(-1);
            } else {
                throw new Error(response.message || "수정 실패");
            }

        } catch (error) {
            console.error("저장 실패:", error);
            const msg = error.response?.data?.message || "저장에 실패했습니다. 다시 시도해주세요.";
            alert(msg);
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div style={styles.container}>
                <div style={styles.loadingText}>정보를 불러오는 중...</div>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            <header style={styles.header}>
                <div style={styles.headerLeft}>
                    <button onClick={handleBackClick} style={styles.backButton}>
                        <img src={leftArrowIcon} alt="닫기" style={styles.backIconImg} />
                    </button>
                    <span style={styles.pageTitle}>아이 정보</span>
                </div>
            </header>
            
            <main style={styles.content}>
                {/* 입력 필드들을 감싸는 영역 
                   flex: 1로 설정하여 남은 공간의 대부분을 차지하게 함
                */}
                <div style={styles.inputsContainer}>
                    <div style={styles.inputWrapper}>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            style={styles.inputField}
                            placeholder="이름"
                            disabled={isSaving}
                        />
                    </div>

                    <div style={styles.inputWrapper}>
                        <input
                            type="tel" 
                            value={birthYear}
                            onChange={handleYearChange}
                            style={styles.inputField}
                            placeholder="태어난 해 (YYYY)"
                            disabled={isSaving}
                        />
                    </div>
                </div>

                {/* 저장 버튼 영역
                   버튼은 하단에 배치되지만 화면이 줄어들면 같이 올라옴
                */}
                <div style={styles.buttonContainer}>
                    <button 
                        onClick={handleSave} 
                        style={{
                            ...styles.saveButton,
                            backgroundColor: isSaving ? '#ccc' : 'var(--color-main)', 
                            cursor: isSaving ? 'not-allowed' : 'pointer'
                        }}
                        disabled={isSaving}
                    >
                        {isSaving ? '저장 중...' : '저장하기'}
                    </button>
                </div>
            </main>
        </div>
    );
};

// --- Styles (수정됨) ---
const styles = {
    container: {
        backgroundColor: 'var(--color-second)', 
        height: '100%',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: 'clamp(5px, 3vw, 20px)',
        position: 'relative',
        overflow: 'hidden',
    },
    header: {
        display: 'flex',
        justifyContent: 'flex-start', // 왼쪽 정렬 유지
        alignItems: 'center',
        marginBottom: 'clamp(5px, 2vh, 10px)',
        padding: 'clamp(1px, 1vw, 5px) clamp(1px, 1vw, 5px)',
        width: '100%', // 전체 너비 사용
        alignSelf: 'center', // 중앙 정렬
    },
    headerLeft: {
        display: 'flex',
        alignItems: 'center',
        gap: 'clamp(10px, 3vw, 15px)', // 간격 반응형
    },
    backButton: {
        background: 'var(--color-fourth)', 
        border: 'clamp(2px, 0.5vw, 3px) solid var(--color-text-dark)', // 테두리 반응형
        borderRadius: '50%',
        width: 'clamp(30px, 8vw, 40px)',
        height: 'clamp(30px, 8vw, 40px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        padding: 0,
        boxShadow: '0 4px 6px rgba(0,0,0,0.15)', // 그림자 유지
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
    
    // --- 메인 컨텐츠 (수정: 중앙 정렬 강화) ---
    content: {
        flex: 1,
        width: '100%',
        maxWidth: 'min(90%, 500px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 0,
    },
    
    // ✨ 입력 영역: content의 50% 차지
    inputsContainer: {
        width: '100%',
        height: '50%', // ✨ 고정 50%
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center', // ✨ 중앙 배치
        alignItems: 'center',
        gap: 'clamp(10px, 2vh, 20px)',
    },
    inputWrapper: {
        width: '100%',
        display: 'flex', 
        justifyContent: 'center',
        flex: 1, // ✨ 두 입력 필드가 균등하게 공간 차지
        maxHeight: '45%', // ✨ 각 필드가 너무 커지지 않도록 제한
    },
    
    // ✨ 입력 필드: wrapper 높이에 맞춤
    inputField: {
        width: '100%',
        height: '100%', // ✨ wrapper 높이를 꽉 채움
        maxHeight: '70px', // ✨ 최대 높이 제한
        minHeight: '40px', // ✨ 최소 높이 보장
        fontSize: 'clamp(12px, 3.5vw, 18px)',
        padding: '0 clamp(10px, 3vw, 25px)',
        textAlign: 'center', 
        borderRadius: 'clamp(20px, 5vh, 50px)',
        border: 'clamp(2px, 0.4vw, 3px) solid var(--color-text-dark)', 
        outline: 'none',
        fontFamily: "var(--font-family-primary)",
        boxSizing: 'border-box',
        color: 'var(--color-text-dark)',
        backgroundColor: '#ffffff', 
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    },
    
    // ✨ 버튼 영역: content의 50% 차지
    buttonContainer: {
        width: '100%',
        height: '50%', // ✨ 고정 50%
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center', // ✨ 수직 중앙 정렬
    },
    
    // ✨ 저장 버튼
    saveButton: {
        backgroundColor: 'var(--color-main)', 
        border: 'clamp(2px, 0.4vw, 3px) solid var(--color-text-dark)',
        borderRadius: 'clamp(25px, 5vh, 50px)',
        width: 'clamp(120px, 25vw, 180px)',
        height: 'clamp(35px, 8vh, 70px)',
        maxHeight:'60%',
        fontSize: 'clamp(14px, 3.5vw, 20px)',
        color: 'var(--color-text-dark)',
        cursor: 'pointer',
        boxShadow: '0 4px 8px rgba(0,0,0,0.15)',
        fontFamily: "var(--font-family-primary)",
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop:'5%'
    },
    
    loadingText: {
        color: 'var(--color-text-light)',
        fontSize: 'clamp(1.2rem, 4vw, 1.5rem)',
        marginTop: 'clamp(50px, 10vh, 100px)',
        fontFamily: "var(--font-family-primary)",
    },
};

export default EditChildPage;