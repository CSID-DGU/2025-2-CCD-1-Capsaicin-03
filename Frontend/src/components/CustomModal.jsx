// src/components/CustomModal.jsx

const CustomModal = ({ 
  isOpen, 
  message, 
  onConfirm, 
  onCancel, 
  showCancel = true,
  cancelText = "취소", // 이전 대화 내용 반영 (버튼 텍스트 변경 가능하도록)
  confirmText = "확인" 
}) => {
  if (!isOpen) return null;

  return (
    <div style={modalStyles.overlay}>
      <div style={modalStyles.container}>
        <p style={modalStyles.message}>{message}</p>
        <div style={modalStyles.buttonGroup}>
          {/* 취소 버튼 */}
          {showCancel && (
            <button style={modalStyles.cancelButton} onClick={onCancel}>
              {cancelText}
            </button>
          )}
          {/* 확인 버튼 */}
          <button style={modalStyles.confirmButton} onClick={onConfirm}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

const modalStyles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    padding: '20px', 
  },
  container: {
    backgroundColor: 'var(--color-second)', 
    padding: 'clamp(20px, 2vh, 30px) clamp(20px, 5vw, 30px)', 
    borderRadius: '20px',
    width: 'min(60%, 350px)',
    textAlign: 'center',
    boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
    border: '2px solid var(--color-text-dark)',
    boxSizing: 'border-box', 
  },
  message: {
    color: 'var(--color-text-light)',
    fontSize: 'clamp(0.9rem, 3vw, 1.4rem)', 
    fontFamily: 'var(--font-family-primary)',
    whiteSpace: 'pre-line',
    lineHeight: '1.5',
    wordBreak: 'keep-all', 
  },
  buttonGroup: {
    display: 'flex',
    justifyContent: 'center',
    gap: 'clamp(10px, 3vw, 20px)',
    flexWrap: 'nowrap', 
  },
  cancelButton: {
    backgroundColor: 'var(--color-third)', 
    color: 'var(--color-text-dark)', 
    border: '3px solid var(--color-text-dark)',
    borderRadius: '20px',
    padding: 'clamp(8px, 1.5vh, 10px) clamp(20px, 4vw, 30px)',
    fontSize: 'clamp(0.9rem, 3vw, 1.1rem)', 
    cursor: 'pointer',
    fontFamily: 'var(--font-family-primary)',
    minWidth: 'clamp(30px, 10vw, 50px)', 
    whiteSpace: 'nowrap', 
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmButton: {
    backgroundColor: 'var(--color-fourth)', 
    color: 'var(--color-text-dark)',
    border: '3px solid var(--color-text-dark)',
    boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
    borderRadius: '20px',
    padding: 'clamp(8px, 1.5vh, 10px) clamp(20px, 4vw, 30px)',
    fontSize: 'clamp(0.9rem, 3vw, 1.1rem)',
    cursor: 'pointer',
    fontFamily: 'var(--font-family-primary)',
    minWidth: 'clamp(30px, 10vw, 50px)', 
      whiteSpace: 'nowrap',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
};

export default CustomModal;