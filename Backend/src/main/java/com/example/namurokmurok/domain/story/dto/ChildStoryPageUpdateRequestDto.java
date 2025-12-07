package com.example.namurokmurok.domain.story.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Getter
@AllArgsConstructor
@Builder
public class ChildStoryPageUpdateRequestDto {

    @Schema(description = "페이지 ", example = "10", nullable = true)
    @JsonProperty("page_number")
    private Integer pageNumber;

    @Schema(description = "완독 여부", example = "true", nullable = true)
    @JsonProperty("is_end")
    private Boolean end;
}