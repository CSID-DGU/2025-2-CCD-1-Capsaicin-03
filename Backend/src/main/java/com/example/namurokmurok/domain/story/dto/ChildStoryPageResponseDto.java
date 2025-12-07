package com.example.namurokmurok.domain.story.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Getter
@AllArgsConstructor
@Builder
public class ChildStoryPageResponseDto {
    @Schema(description = "아이 ID", example = "1")
    @JsonProperty("child_id")
    private long childId;

    @Schema(description = "동화 ID", example = "3")
    @JsonProperty("story_id")
    private long storyId;

    @Schema(description = "페이지", example = "7")
    @JsonProperty("page_number")
    private int pageNumber;

    @Schema(description = "완독 여부", example = "false")
    @JsonProperty("is_end")
    private Boolean end;
}