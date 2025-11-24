package com.example.namurokmurok.domain.conversation.dto;

import com.example.namurokmurok.domain.conversation.enums.Speaker;
import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class DialogueLogDto {
    @Schema(description = "로그 ID", example = "1")
    @JsonProperty("log_id")
    private Long logId;

    @Schema(description = "턴 순서", example = "1")
    @JsonProperty("turn_order")
    private int turnOrder;

    @Schema(description = "발화자(AI, CHILD)", example = "AI")
    private Speaker speaker;

    @Schema(description = "발화 내용", example = "놀부가 내 집을 망가뜨려서 너무 짜증나")
    private String content;

    @Schema(description = "금칙어 위반 여부", example = "false")
    @JsonProperty("is_violated")
    private boolean violated;

    @Schema(description = "생성 시간", example = "2025-11-25T00:29:18.388674")
    @JsonProperty("created_at")
    private LocalDateTime createdAt;
}
