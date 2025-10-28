package com.example.namurokmurok.domain.user.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class ChildResponseDto {
    @Schema(description = "아이 ID", example = "1")
    private Long childId;
}