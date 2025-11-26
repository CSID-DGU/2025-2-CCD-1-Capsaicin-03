package com.example.namurokmurok.domain.feedback.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;

@Builder
@Getter
public class FeedbackDetailResponseDto {
    @Schema(description = "피드백 ID", example = "1")
    private Long id;

    @Schema(description = "동화 제목", example = "가난한 유산")
    private String title;

    @Schema(description = "대화 피드백", example = "처음에는 집중력이 조금 흐트러지며..")
    @JsonProperty("conversation_feedback")
    private String conversationFeedback;

    @Schema(description = "지도 방향", example = "우리 아이가 '슬플 것 같아'라고 자신의 감정을 표현했어요. 이는 정서 인식 능력이 발달하고 있다는 신호거든요")
    @JsonProperty("action_guide")
    private String actionGuide;
}
