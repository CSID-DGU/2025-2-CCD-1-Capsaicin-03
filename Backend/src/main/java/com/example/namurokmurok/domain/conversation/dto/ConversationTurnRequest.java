package com.example.namurokmurok.domain.conversation.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class ConversationTurnRequest {
    @Schema(description = "세션 ID", example = "1EJL-Ks2s-ds100gfdeojFp")
    private String session_id;

    @Schema(description = "아이 ID", example = "12")
    private Long child_id;

    @Schema(description = "동화 ID", example = "1")
    private Long story_id;

    @Schema(description = "대화 턴", example = "1")
    private int turn;
}
