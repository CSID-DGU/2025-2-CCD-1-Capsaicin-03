package com.example.namurokmurok.domain.conversation.dto;

import com.example.namurokmurok.global.common.enums.GenerationStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDate;

@Getter
@Builder
public class ConversationListResponseDto {

    @Schema(description = "대화 ID(세션ID)", example = "1EJL-Ks2s-ds100gfdeojFp")
    private String id;

    @Schema(description = "대화 일자", example = "2025-11-25")
    private LocalDate date;

    @Schema(description = "동화 제목", example = "흥부와 놀부")
    private String title;

    @Schema(description = "대화 생성 상태", example = "GENERATING")
    private GenerationStatus status;
}
