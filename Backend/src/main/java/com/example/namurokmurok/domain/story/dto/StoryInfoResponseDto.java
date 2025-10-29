package com.example.namurokmurok.domain.story.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
@AllArgsConstructor
public class StoryInfoResponseDto {
    @Schema(description = "동화책 ID", example = "i")
    private long id;

    @Schema(description = "동화 제목", example = "흥부 놀부")
    private String title;

    @Schema(description = "총 페이지 수", example = "20")
    private int totalPages;

    @Schema(description = "장면 정보")
    private List<PageInfoResponseDto> pages;
}
