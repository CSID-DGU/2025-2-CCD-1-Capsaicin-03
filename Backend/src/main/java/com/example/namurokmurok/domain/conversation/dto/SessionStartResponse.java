package com.example.namurokmurok.domain.conversation.dto;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

@Builder
@Getter
public class SessionStartResponse {
    private boolean success;

    private String session_id;

    private String character_name;

    private String ai_intro;    //인트로 텍스트

    @Setter
    private String ai_intro_audio_base64; // 인트로 오디오

    private String stage;
}