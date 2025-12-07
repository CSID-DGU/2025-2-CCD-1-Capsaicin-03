// src/hooks/useAudioPlayback.js
import { useRef, useEffect } from 'react';

/**
 * 오디오 재생을 관리하는 커스텀 훅
 * @param {string | null} audioSrc - 재생할 오디오 파일 경로
 * @param {boolean} shouldPlay - 현재 재생되어야 하는지 여부
 */
export const useAudioPlayback = (audioSrc, shouldPlay) => {
    const audioRef = useRef(new Audio());

    useEffect(() => {
        const audio = audioRef.current;

        if (shouldPlay && audioSrc) {
            if (audio.src !== audioSrc) { 
                audio.src = audioSrc;
            }
            
            const playPromise = audio.play();
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    console.warn(`[useAudioPlayback] 오디오 자동재생 차단: ${error.message}`);
                });
            }
        } else {
            audio.pause();
            audio.currentTime = 0;
        }

    }, [audioSrc, shouldPlay]); 

    useEffect(() => {
    const handleVisibilityChange = () => {
      const audio = audioRef.current;
      if (!audio) return;

      if (document.visibilityState === 'hidden') {
        console.log("[Audio] 앱 백그라운드 전환 -> 오디오 일시정지");
        audio.pause(); 
      } 
      else if (document.visibilityState === 'visible') {
        if (shouldPlay && audioSrc) {
            console.log("[Audio] 앱 포그라운드 전환 -> 오디오 재개 시도");
            audio.play().catch(e => console.log("자동 재생 정책으로 인해 재생 실패:", e));
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [shouldPlay, audioSrc]);

    // 컴포넌트 언마운트 시 오디오 정리
    useEffect(() => {
        const audio = audioRef.current;
        return () => {
            audio.pause();
            audio.src = '';
        };
    }, []); 

    // '다시 듣기' 기능
    const handleReplay = () => {
        const audio = audioRef.current;
        audio.pause();
        audio.currentTime = 0;
        audio.play().catch(error => {
             console.warn(`[useAudioPlayback] 다시 듣기 실패: ${error.message}`);
        });
    };

    return { audioRef, handleReplay };
};