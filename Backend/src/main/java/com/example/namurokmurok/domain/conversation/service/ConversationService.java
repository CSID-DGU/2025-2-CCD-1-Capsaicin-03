package com.example.namurokmurok.domain.conversation.service;

import com.example.namurokmurok.domain.conversation.dto.*;
import com.example.namurokmurok.domain.conversation.entity.Conversation;
import com.example.namurokmurok.domain.conversation.entity.Dialogue;
import com.example.namurokmurok.domain.conversation.enums.ConversationStatus;
import com.example.namurokmurok.domain.conversation.enums.Speaker;
import com.example.namurokmurok.domain.conversation.enums.Stage;
import com.example.namurokmurok.domain.conversation.repository.ConversationRepository;
import com.example.namurokmurok.domain.conversation.repository.DialogueRepository;
import com.example.namurokmurok.domain.story.entity.Story;
import com.example.namurokmurok.domain.story.repository.StoryRepository;
import com.example.namurokmurok.domain.user.entity.Child;
import com.example.namurokmurok.domain.user.repository.ChildRepository;
import com.example.namurokmurok.global.client.AiApiClient;
import com.example.namurokmurok.global.common.exception.CustomException;
import com.example.namurokmurok.global.common.exception.ErrorCode;
import com.example.namurokmurok.global.s3.S3Uploader;
import com.example.namurokmurok.global.common.enums.GenerationStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ConversationService {

    private final AiApiClient aiApiClient;
    private final S3Uploader s3Uploader;

    private final ChildRepository childRepository;
    private final StoryRepository storyRepository;
    private final ConversationRepository conversationRepository;
    private final DialogueRepository dialogueRepository;

    // 세션 발급
    @Transactional
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

        // fastAPI 요청
        SessionStartResponse response = aiApiClient.startSession(request);

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

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime expireAt = now.plusHours(1); // 세션 만료 시간 : 발급 후 1시간

        // DB에 Conversation 저장
        Conversation conversation = Conversation.builder()
                .id(response.getSession_id())
                .child(child)
                .story(story)
                .status(ConversationStatus.STARTED)
                .startedAt(now)
                .createdAt(now)
                .expireAt(expireAt)
                .build();

        conversationRepository.save(conversation);

        // 인트로 질문 Dialogue에 저장
        Dialogue introLog = Dialogue.builder()
                .conversation(conversation)
                .turnNumber(1)
                .stage(Stage.INTRO)
                .retryCount(0)
                .speaker(Speaker.AI)
                .content(response.getAi_intro())
                .audioUrl(introAudioUrl)
                .createdAt(LocalDateTime.now())
                .isSafe(true)
                .unsafeReason(null)
                .fallbackTriggered(false)
                .build();

        dialogueRepository.save(introLog);

        return response;
    }

    // 대화 목록 조회
    public List<ConversationListResponseDto> getConversationList(Long userId) {

        Child child = childRepository.findByUserId(userId)
                .orElseThrow(() -> new CustomException(ErrorCode.CHILD_NOT_FOUND));

        List<Conversation> conversations =
                conversationRepository.findAllByChildIdOrderByCreatedAtDesc(child.getId());

        return conversations.stream()
                .map(con -> ConversationListResponseDto.builder()
                        .id(con.getId())
                        .date(con.getCreatedAt().toLocalDate())
                        .title(con.getStory().getTitle())
                        .status(determineGenerationStatus(con))
                        .build()
                )
                .toList();
    }

    // 대화 로그 생성 상태 계산
    private GenerationStatus determineGenerationStatus(Conversation conversation) {
        if (conversation.getStatus() == ConversationStatus.COMPLETED) {
            return GenerationStatus.COMPLETED;
        }

        if (conversation.getStatus() == ConversationStatus.FAILED) {
            return GenerationStatus.FAILED;
        }

        return GenerationStatus.GENERATING;
    }

    // 대화 상세 조회
    public ConversationDetailResponseDto getConversationDetail(Long userId, String conversationId) {

        Child child = childRepository.findByUserId(userId)
                .orElseThrow(() -> new CustomException(ErrorCode.CHILD_NOT_FOUND));

        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new CustomException(ErrorCode.CONVERSATION_NOT_FOUND));

        if (!conversation.getChild().getId().equals(child.getId())) {
            throw new CustomException(ErrorCode.CONVERSATION_ACCESS_DENIED);
        }

        List<Dialogue> logs =
                dialogueRepository.findAllByConversationIdOrderByTurnNumberAsc(conversationId);

        List<DialogueLogDto> logDtos = logs.stream()
                .map(log -> DialogueLogDto.builder()
                        .logId(log.getId())
                        .turnOrder(log.getTurnNumber())
                        .speaker(log.getSpeaker())
                        .content(log.getContent())
                        .violated(!log.isSafe())
                        .createdAt(log.getCreatedAt())
                        .build()
                )
                .toList();

        return ConversationDetailResponseDto.builder()
                .id(conversationId)
                .logs(logDtos)
                .build();
    }

    @Transactional
    // 대화 상태 FAILED 처리
    public void failConversation(String conversationId) {
        Conversation conv = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new CustomException(ErrorCode.CONVERSATION_NOT_FOUND));

        // 이미 COMPLETED 또는 FAILED면 중복 수정 방지
        if (conv.isFinished()) {
            return ;
        }

        conv.updateStatus(ConversationStatus.FAILED);
        conv.updateEndedAt(LocalDateTime.now());
    }

}