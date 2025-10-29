package com.example.namurokmurok.domain.story.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Getter
@AllArgsConstructor
@Builder
public class StorySummaryResponseDto {
    @Schema(description = "스토리 ID", example = "1")
    private Long id;

    @Schema(description = "동화 제목", example = "콩쥐팥쥐")
    private String title;

    @Schema(description = "썸네일 이미지 URL", example = "https://example.com/image.jpg")
    private String thumbnailImgUrl;

    @Schema(description = "썸네일 오디오 URL", example = "https://example.com/audio.mp3")
    private String thumbnailAudioUrl;
}
