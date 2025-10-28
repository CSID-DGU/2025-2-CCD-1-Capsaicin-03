package com.example.namurokmurok.domain.user.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.Getter;

import java.time.LocalDate;

@Getter
public class ChildRequestDto {
    @NotBlank(message = "아이 이름은 필수입니다.")
    @Pattern(
            regexp = "^[가-힣a-zA-Z]{1,10}$",
            message = "이름은 한글 또는 영문 1~10자로 입력해주세요."
    )
    @Schema(description = "아이 이름", example = "홍길동")
    private String name;

    @NotNull(message = "생년월일은 필수입니다.")
    @Schema(description = "아이 생년월일", example = "2022-01-01")
    private LocalDate birth;
}