package com.example.namurokmurok.domain.feedback.dto;


import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Builder
@Getter
public class FeedbackResponseDto {
    @Schema(description = "대화 ID(세션ID)", example = "1EJL-Ks2s-ds100gfdeojFp")
    private String id;

    @Schema(description = "피드백 내용", example = "우리 아이가 '슬플 것 같아'라고 자신의 감정을 표현했어요. 이는 정서 인식 능력이 발달하고 있다는 신호거든요")
    @JsonProperty("child_analysis_feedback")
    private String analysisFeedback;

    @Schema(description = "대화 ID(세션ID)", example = "1EJL-Ks2s-ds100gfdeojFp")
    @JsonProperty("parent_action_guide")
    private String actionGuide;

    @Schema(description = "대화 ID(세션ID)", example = "1EJL-Ks2s-ds100gfdeojFp")
    @JsonProperty("generated_at")
    private LocalDateTime generatedAt;
}
