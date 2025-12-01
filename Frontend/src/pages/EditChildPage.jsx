// src/pages/EditChildPage.jsx

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

// --- Styles ---
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
    
    inputsContainer: {
        width: '100%',
        height: '50%', 
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center',
        gap: 'clamp(10px, 2vh, 20px)',
    },
    inputWrapper: {
        width: '100%',
        display: 'flex', 
        justifyContent: 'center',
        flex: 1, 
        maxHeight: '45%', 
    },
    
    inputField: {
        width: '100%',
        height: '100%',
        maxHeight: '70px', 
        minHeight: '40px',
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
    
    buttonContainer: {
        width: '100%',
        height: '50%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center', 
    },
    
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