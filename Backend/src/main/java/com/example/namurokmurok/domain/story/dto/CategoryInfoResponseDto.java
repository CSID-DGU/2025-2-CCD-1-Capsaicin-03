package com.example.namurokmurok.domain.story.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Getter
@AllArgsConstructor
@Builder
public class CategoryInfoResponseDto {
    @Schema(description = "카테고리 코드", example = "SA")
    private String code;

    @Schema(description = "카테고리 이름", example = "내 마음 살펴보기")
    private String name;
}
