package com.example.namurokmurok.domain.story.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@AllArgsConstructor
public class IntroQuestionResponseDto {
    @Schema(description = "질문 ID", example = "1")
    private long id;

    @Schema(description = "동화 ID", example = "2")
    private long story_id;

    @Schema(description = "질문 text 내용", example = "새어머니가 나한테 구멍 난 항아리에 물을 채우라고 했어. 그때 내 마음이 어땠을 것 같아?")
    private String text_content;

    @Schema(description = "질문 이미지 URL", example = "https://example.com/image.jpg")
    private String img_url;

    @Schema(description = "질문 음성 URL", example = "https://example.com/audio.mp3")
    private String audio_url;
}
