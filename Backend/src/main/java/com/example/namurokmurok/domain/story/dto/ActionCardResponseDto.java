package com.example.namurokmurok.domain.story.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Getter
@AllArgsConstructor
@Builder
public class ActionCardResponseDto {
    @Schema(description = "행동카드 ID", example = "1")
    private long id;

    @Schema(description = "동화 ID", example = "2")
    private long story_id;

    @Schema(description = "행동카드 제목 ID", example = "1부터 10까지 세기")
    private String title;

    @Schema(description = "상황 내용", example = "친구의 얼굴을 봤는데, 웃고 있지 않아요..")
    @JsonProperty("situation_content")
    private String situationContent;

    @Schema(description = "행동카드 내용", example = "눈, 입, 얼굴을 천천히 살펴보자. 이 표정일 때 어떤 마음일지 생각해보자.")
    @JsonProperty("action_content")
    private String actionContent;

    @Schema(description = "행동카드 이미지 URL", example = "https://example.com/image.jpg")
    private String img_url;
}