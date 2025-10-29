package com.example.namurokmurok.domain.story.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
@AllArgsConstructor
public class StoryListResponseDto {
    @Schema(description = "카테고리 정보")
    private CategoryInfoResponseDto category;

    @Schema(description = "스토리 목록")
    private List<StorySummaryResponseDto> stories;
}
