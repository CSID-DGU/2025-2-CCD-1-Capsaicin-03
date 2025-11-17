package com.example.namurokmurok.domain.conversation.service;

import com.example.namurokmurok.domain.conversation.dto.SessionStartRequest;
import com.example.namurokmurok.domain.conversation.dto.SessionStartResponse;
import com.example.namurokmurok.global.client.AiApiClient;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.BodyInserters;

@Service
@RequiredArgsConstructor
public class ConversationService {

    private final AiApiClient aiApiClient;

    public SessionStartResponse startSession(SessionStartRequest request) {

        var form = BodyInserters
                .fromFormData("story_name", request.getStory_name())
                .with("child_name", request.getChild_name())
                .with("child_age", String.valueOf(request.getChild_age()));

        return aiApiClient.postForm(
                "/api/v1/dialogue/session/start",
                form,
                SessionStartResponse.class
        );
    }
}
