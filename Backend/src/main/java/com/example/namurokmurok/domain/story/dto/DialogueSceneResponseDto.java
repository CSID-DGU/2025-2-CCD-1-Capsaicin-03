package com.example.namurokmurok.domain.story.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@AllArgsConstructor
public class DialogueSceneResponseDto {

    @Schema(description = "동화 페이지 ID", example = "1")
    private long id;

    @Schema(description = "동화 ID", example = "3")
    private long story_id;

    @Schema(description = "페이지 넘버", example = "21")
    private int page_number;

    @Schema(description = "장면 text 내용", example = "옛날 옛적, 마음씨 고약한 형 놀부가 살았어요.")
    private String text_content;

    @Schema(description = "장면 이미지 URL", example = "https://example.com/image.jpg")
    private String img_url;

    @Schema(description = "장면 음성 URL", example = "https://example.com/audio.mp3")
    private String audio_url;
}
