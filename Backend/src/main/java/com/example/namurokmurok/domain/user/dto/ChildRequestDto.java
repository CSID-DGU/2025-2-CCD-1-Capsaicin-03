package com.example.namurokmurok.domain.user.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;

import java.time.LocalDate;

@Getter
public class ChildRequestDto {
    @Schema(description = "아이 이름", example = "홍길동")
    private String name;

    @Schema(description = "아이 생년월일", example = "2022-01-01")
    private LocalDate birth;
}