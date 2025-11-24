package com.example.namurokmurok.domain.conversation.service;

import com.example.namurokmurok.domain.conversation.dto.SessionStartRequest;
import com.example.namurokmurok.domain.conversation.dto.SessionStartResponse;
import com.example.namurokmurok.domain.conversation.entity.Conversation;
import com.example.namurokmurok.domain.conversation.enums.ConversationStatus;
import com.example.namurokmurok.domain.conversation.repository.ConverstationRepository;
import com.example.namurokmurok.domain.story.entity.Story;
import com.example.namurokmurok.domain.story.repository.StoryRepository;
import com.example.namurokmurok.domain.user.entity.Child;
import com.example.namurokmurok.domain.user.repository.ChildRepository;
import com.example.namurokmurok.global.client.AiApiClient;
import com.example.namurokmurok.global.exception.CustomException;
import com.example.namurokmurok.global.exception.ErrorCode;
import com.example.namurokmurok.global.s3.S3Uploader;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.BodyInserters;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class ConversationService {

    private final AiApiClient aiApiClient;
    private final S3Uploader s3Uploader;

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

        if (story.getIntroQuestions().isEmpty()) {
            throw new CustomException(ErrorCode.INTRO_QUESTION_NOT_FOUND);
        }
        String introQuestion = story.getIntroQuestions().get(0).getTextContent();

        SessionStartRequest request = SessionStartRequest.builder()
                .story_name(story.getTitle())
                .child_name(child.getName())
                .child_age(childAge)
                .intro(introQuestion)
                .build();

        // FastAPI 세션 id 발급 요청
        var form = BodyInserters
                .fromFormData("story_name", request.getStory_name())
                .with("child_name", request.getChild_name())
                .with("child_age", String.valueOf(request.getChild_age()))
                .with("intro", request.getIntro());

        SessionStartResponse response = aiApiClient.postForm(
                "/api/v1/dialogue/session/start",
                form,
                SessionStartResponse.class
        );

        String introAudioBase64 = response.getAi_intro_audio_base64();

        String introAudioUrl = null;
        if (introAudioBase64 != null && !introAudioBase64.isEmpty()) {

            String fileName = String.format(
                    "conversation/%s/intro.mp3",
                    response.getSession_id()
            );

            introAudioUrl = s3Uploader.upload(introAudioBase64, fileName);
        }

        // s3에 업로드된 오디오 url로 교체
        response.setAi_intro_audio_base64(introAudioUrl);

        // DB에 Conversation 저장
        Conversation conversation = Conversation.builder()
                .id(response.getSession_id())
                .child(child)
                .story(story)
                .status(ConversationStatus.STARTED)
                .startedAt(LocalDateTime.now())
                .createdAt(LocalDateTime.now())
                .build();

        converstationRepository.save(conversation);

        return response;
    }
}
