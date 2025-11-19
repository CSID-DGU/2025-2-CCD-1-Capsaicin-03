package com.example.namurokmurok.domain.conversation.dto;

import com.example.namurokmurok.domain.conversation.enums.Stage;
import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class ConversationTurnResponse {

    @Schema(description = "세션 ID", example = "1EJL-Ks2s-ds100gfdeojFp")
    @JsonProperty("session_id")
    private String sessionId;

    @Schema(description = "현재 턴", example = "S1")
    @JsonProperty("current_stage")
    private Stage currentStage;

    @Schema(description = "다음 턴 (종료 시 null)", example = "S2")
    @JsonProperty("next_stage")
    private String nextStage;

    @Schema(description = "아이 답변(TEXT)", example = "슬펐을 것 같아.")
    @JsonProperty("stt_text")
    private String sttText;

    @Schema(description = "AI 질문(TEXT)", example = "그렇구나, 왜 슬펐어?")
    @JsonProperty("ai_text")
    private String aiText;

    @Schema(description = "AI 음성 질문(음성)", example = "https://s3.amazonaws.com/tts/turn2.mp3")
    @JsonProperty("tts_audio_url")
    private String ttsAudioUrl;

    @Schema(description = "대화 종료 여부", example = "false")
    @JsonProperty("is_end")
    private boolean end;
}