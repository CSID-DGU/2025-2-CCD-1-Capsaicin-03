package com.example.namurokmurok.domain.conversation.dto;

import com.example.namurokmurok.domain.conversation.enums.Stage;
import lombok.Builder;
import lombok.Getter;

import java.io.File;

@Getter
@Builder
public class DialogueTurnRequest {
    private String sessionId;
    private Stage stage;
    private File audioFile;
}
