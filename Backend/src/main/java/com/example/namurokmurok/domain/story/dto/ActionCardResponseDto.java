package com.example.namurokmurok.domain.story.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Getter
@AllArgsConstructor
@Builder
public class ActionCardResponseDto {
    @Schema(description = "행동카드 ID", example = "1")
    private long id;

    @Schema(description = "동화 ID", example = "2")
    private long story_id;

    @Schema(description = "행동카드 제목 ID", example = "1부터 10까지 세기")
    private String title;

    @Schema(description = "행동카드 내용", example = "화가 날 때 눈을 감고 1부터 10까지 세봐.")
    private String content;

    @Schema(description = "행동카드 이미지 URL", example = "https://example.com/image.jpg")
    private String img_url;
}
