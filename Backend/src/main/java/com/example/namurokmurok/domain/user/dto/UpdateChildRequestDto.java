package com.example.namurokmurok.domain.user.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@AllArgsConstructor
public class UpdateChildRequestDto {
    @Schema(description = "아이 이름", example = "홍길동", nullable = true)
    private String name;

    @Schema(description = "아이 출생 연도", example = "1", nullable = true)
    private Integer birth_year;
}
