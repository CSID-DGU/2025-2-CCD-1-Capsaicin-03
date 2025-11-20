package com.example.namurokmurok.domain.user.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Getter
@AllArgsConstructor
@Builder
public class ChildResponseDto {
    @Schema(description = "아이 ID", example = "1")
    private long id;

    @Schema(description = "아이 이름", example = "홍길동")
    private String name;

    @Schema(description = "아이 출생 연도", example = "2010")
    private Integer birth_year;
}