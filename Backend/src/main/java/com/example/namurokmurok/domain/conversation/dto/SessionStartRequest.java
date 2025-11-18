package com.example.namurokmurok.domain.conversation.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class SessionStartRequest {
    private String story_name;
    private String child_name;
    private int child_age;
}
