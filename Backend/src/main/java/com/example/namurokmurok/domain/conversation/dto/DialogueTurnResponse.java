package com.example.namurokmurok.domain.conversation.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.ToString;

@Getter
@NoArgsConstructor
@ToString
public class DialogueTurnResponse {

    private boolean success;

    @JsonProperty("session_id")
    private String sessionId;

    private String stage;

    @JsonProperty("next_stage")
    private String nextStage;

    @JsonProperty("retry_count")
    private int retryCount;

    private ResultData result;

    // 내부 클래스로 구조 정의
    @Getter
    @NoArgsConstructor
    @ToString
    public static class ResultData {
        @JsonProperty("stt_result")
        private SttResult sttResult;

        @JsonProperty("safety_check")
        private SafetyCheck safetyCheck;

        @JsonProperty("ai_response")
        private AiResponse aiResponse;
    }

    @Getter
    @NoArgsConstructor
    @ToString
    public static class SttResult {
        private String text;
        private double confidence;
    }

    @Getter
    @NoArgsConstructor
    @ToString
    public static class SafetyCheck {
        @JsonProperty("is_safe")
        private boolean isSafe;
        private String[] flagged_categories;
        private String message;
    }

    @Getter
    @NoArgsConstructor
    @ToString
    public static class AiResponse {
        private String text;

        @JsonProperty("tts_audio")
        private String ttsAudio;
    }
}