package com.example.namurokmurok.domain.conversation.service;

import com.example.namurokmurok.domain.conversation.dto.SessionStartRequest;
import com.example.namurokmurok.domain.conversation.dto.SessionStartResponse;
import com.example.namurokmurok.domain.conversation.entity.Conversation;
import com.example.namurokmurok.domain.conversation.enums.ConverstationStatus;
import com.example.namurokmurok.domain.conversation.repository.ConverstationRepository;
import com.example.namurokmurok.domain.story.entity.Story;
import com.example.namurokmurok.domain.story.repository.StoryRepository;
import com.example.namurokmurok.domain.user.entity.Child;
import com.example.namurokmurok.domain.user.repository.ChildRepository;
import com.example.namurokmurok.global.client.AiApiClient;
import com.example.namurokmurok.global.exception.CustomException;
import com.example.namurokmurok.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.BodyInserters;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class ConversationService {

    private final AiApiClient aiApiClient;
    private final ChildRepository childRepository;
    private final StoryRepository storyRepository;
    private final ConverstationRepository converstationRepository;

    // 세션 발급
    public SessionStartResponse startSession(Long storyId, Long childId) {

        Child child = childRepository.findById(childId)
                .orElseThrow(() -> new CustomException(ErrorCode.CHILD_NOT_FOUND));

        Story story = storyRepository.findById(storyId)
                .orElseThrow(() -> new CustomException(ErrorCode.STORY_NOT_FOUND));

        // 아이 만 나이 계산
        int childAge = LocalDate.now().getYear() - child.getBirthYear();

        SessionStartRequest request = SessionStartRequest.builder()
                .story_name(story.getTitle())
                .child_name(child.getName())
                .child_age(childAge)
                .build();

        // FastAPI 세션 id 발급 요청
        var form = BodyInserters
                .fromFormData("story_name", request.getStory_name())
                .with("child_name", request.getChild_name())
                .with("child_age", String.valueOf(request.getChild_age()));

        SessionStartResponse response = aiApiClient.postForm(
                "/api/v1/dialogue/session/start",
                form,
                SessionStartResponse.class
        );

        // DB에 Conversation 저장
        Conversation conversation = Conversation.builder()
                .id(response.getSession_id())
                .child(child)
                .story(story)
                .status(ConverstationStatus.STARTED)
                .startedAt(LocalDateTime.now())
                .createdAt(LocalDateTime.now())
                .build();

        converstationRepository.save(conversation);

        return response;
    }
}
