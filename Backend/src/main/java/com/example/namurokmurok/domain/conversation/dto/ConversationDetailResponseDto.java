package com.example.namurokmurok.domain.conversation.dto;

import com.example.namurokmurok.domain.conversation.enums.ConversationStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDate;
import java.util.List;

@Getter
@Builder
public class ConversationDetailResponseDto {

    @Schema(description = "대화 ID(세션ID)", example = "1EJL-Ks2s-ds100gfdeojFp")
    private String id;

    @Schema(description = "대화 상태", example = "COMPLETED")
    private ConversationStatus status;

    @Schema(description = "대화 로그 리스트")
    private List<DialogueLogDto> logs;
}
