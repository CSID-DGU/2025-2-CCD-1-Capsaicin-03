package com.example.namurokmurok.domain.story.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class StoryInfoResponseDto {
    @Schema(description = "동화책 ID", example = "i")
    private long id;

    @Schema(description = "동화 제목", example = "흥부 놀부")
    private String title;

    @Schema(description = "총 페이지 수", example = "20")
    @JsonProperty("total_pages")
    private int totalPages;

    @Schema(description = "아이가 마지막으로 읽은 페이지 번호", example = "7",
            nullable = true)
    @JsonProperty("last_read_page")
    private Integer lastReadPage;

    @Schema(description = "장면 정보")
    private List<PageInfoResponseDto> pages;
}
