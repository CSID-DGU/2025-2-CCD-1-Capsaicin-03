// src/hooks/useAudioRecorder.js
import { useState, useRef } from 'react';

/**
 * 음성 녹음을 관리하는 커스텀 훅
 * @param {object} options - 옵션
 * @param {function} options.onStop - 녹음이 중지되고 Blob이 생성되었을 때 호출될 콜백 함수. (audioBlob, audioUrl)을 인자로 받음.
 */

export const useAudioRecorder = ({ onStop = () => {} }) => {
    const [isRecording, setIsRecording] = useState(false);
    const [recordedAudioURL, setRecordedAudioURL] = useState(null);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);

    const startRecording = async () => {
        setRecordedAudioURL(null); 
        
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];
            mediaRecorder.ondataavailable = (event) => {
                audioChunksRef.current.push(event.data);
            };

            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                const audioUrl = URL.createObjectURL(audioBlob);
                setRecordedAudioURL(audioUrl); //상태에 URL 저장 (미리듣기용)
                
                console.log("녹음 완료. URL:", audioUrl);

                if (onStop) {
                    onStop(audioBlob, audioUrl);
                }
            };

            mediaRecorder.start();
            setIsRecording(true);
            console.log("녹음 시작");

        } catch (err) {
            console.error("마이크 권한 오류:", err);
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
            mediaRecorderRef.current.stop(); 
            
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
            
            setIsRecording(false);
            console.log("녹음 중지");
        }
    };

    return {
        isRecording,
        recordedAudioURL,
        startRecording, 
        stopRecording, 
    };
};