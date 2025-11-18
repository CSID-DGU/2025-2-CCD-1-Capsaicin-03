package com.example.namurokmurok.domain.conversation.dto;

import lombok.Builder;
import lombok.Getter;

@Builder
@Getter
public class SessionStartResponse {
    private boolean success;
    private String session_id;
    private String character_name;
    private String ai_intro;
    private String stage;
}