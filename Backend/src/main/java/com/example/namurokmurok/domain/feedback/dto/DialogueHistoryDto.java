package com.example.namurokmurok.domain.feedback.dto;

import com.example.namurokmurok.domain.conversation.entity.Dialogue;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class DialogueHistoryDto {

    @JsonProperty("role")
    private String role; // << Speaker enum X

    @JsonProperty("stage")
    private String stage;

    @JsonProperty("turn")
    private int turn;

    @JsonProperty("content")
    private String content;

    @JsonProperty("emotion")
    private String emotion;

    public static DialogueHistoryDto fromDialogue(Dialogue log) {
        return DialogueHistoryDto.builder()
                .role(log.getSpeaker().name().toLowerCase())
                .stage(log.getStage().name())
                .turn(log.getTurnNumber())
                .content(log.getContent())
                .emotion(log.getEmotion())
                .build();
    }
}
