package com.example.namurokmurok.domain.feedback.dto;

import com.example.namurokmurok.global.common.enums.GenerationStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDate;

@Builder
@Getter
public class FeedbackListResponseDto {
    @Schema(description = "피드백 ID", example = "1")
    private Long id;

    @Schema(description = "대화 일자", example = "2025-11-26")
    private LocalDate date;

    @Schema(description = "동화 제목", example = "가난한 유산")
    private String title;

    @Schema(description = "피드백 생성 상태", example = "COMPLETED")
    private GenerationStatus status;
}
