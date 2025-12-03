package com.example.namurokmurok.domain.feedback.dto;


import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Builder
@Getter
public class FeedbackFromHistoryRequestDto {
    @JsonProperty("conversation_history")
    private List<DialogueHistoryDto> conversationHistory;

    @JsonProperty("child_name")
    private String childName;
}
