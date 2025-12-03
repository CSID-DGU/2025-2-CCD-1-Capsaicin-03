package com.example.namurokmurok.domain.feedback.service;

import com.example.namurokmurok.domain.conversation.entity.Conversation;
import com.example.namurokmurok.domain.conversation.repository.ConversationRepository;
import com.example.namurokmurok.domain.feedback.dto.FeedbackDetailResponseDto;
import com.example.namurokmurok.domain.feedback.dto.FeedbackFromHistoryRequestDto;
import com.example.namurokmurok.domain.feedback.dto.FeedbackListResponseDto;
import com.example.namurokmurok.domain.feedback.dto.FeedbackResponseDto;
import com.example.namurokmurok.domain.feedback.entity.Feedback;
import com.example.namurokmurok.domain.feedback.repository.FeedbackRepository;
import com.example.namurokmurok.domain.user.entity.Child;
import com.example.namurokmurok.domain.user.repository.ChildRepository;
import com.example.namurokmurok.global.client.AiApiClient;
import com.example.namurokmurok.global.common.enums.GenerationStatus;
import com.example.namurokmurok.global.common.exception.CustomException;
import com.example.namurokmurok.global.common.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.function.Supplier;

@Slf4j
@Service
@RequiredArgsConstructor
public class FeedbackService {

    private final ConversationRepository conversationRepository;
    private final FeedbackRepository feedbackRepository;
    private final ChildRepository childRepository;
    private final AiApiClient aiApiClient;

    // 비동기 피드백 생성 (정상 종료)
    @Async
    @Transactional
    public void createFeedbackAsync(String sessionId) {
        log.info("🔄 [ASYNC] 피드백 비동기 생성 시작 sessionId={}", sessionId);
        try {
            createFeedback(sessionId);
        } catch (Exception e) {
            log.error("❌ [ASYNC] 실패 sessionId={}, error={}", sessionId, e.getMessage());
        }
    }

    // 정상 세션 피드백 생성
    @Transactional
    public FeedbackResponseDto createFeedback(String sessionId) {

        log.info("📌 [FEEDBACK] 피드백 생성 요청 시작 - sessionId={}", sessionId);

        // 중복 생성 방지
        if (isFeedbackAlreadyGenerated(sessionId)) {
            return null;
        }

        Conversation conversation = conversationRepository.findById(sessionId)
                .orElseThrow(() -> new CustomException(ErrorCode.CONVERSATION_NOT_FOUND));

        Feedback feedback = Feedback.builder()
                .conversation(conversation)
                .generationStatus(GenerationStatus.GENERATING)
                .generatedAt(LocalDateTime.now())
                .build();

        return processFeedbackCreation(
                feedback,
                () -> aiApiClient.generateAiFeedback(sessionId)
        );
    }

    // 세션 만료 시 대화 기반 피드백 생성
    @Transactional
    public FeedbackResponseDto createFeedbackFromHistory(FeedbackFromHistoryRequestDto requestDto, String sessionId) {

        log.info("📘 [FEEDBACK-HISTORY] 세션 만료 피드백 생성 시작 - sessionId={}", sessionId);

        // 중복 생성 방지
        if (isFeedbackAlreadyGenerated(sessionId)) {
            return null;
        }

        Conversation conversation = conversationRepository.findById(sessionId)
                .orElseThrow(() -> new CustomException(ErrorCode.CONVERSATION_NOT_FOUND));

        Feedback feedback = Feedback.builder()
                .conversation(conversation)
                .generationStatus(GenerationStatus.GENERATING)
                .generatedAt(LocalDateTime.now())
                .build();

        return processFeedbackCreation(
                feedback,
                () -> aiApiClient.generateFeedbackFromHistory(requestDto)
        );
    }

    // 피드백 생성 처리
    private FeedbackResponseDto processFeedbackCreation(
            Feedback feedback,
            Supplier<FeedbackResponseDto> aiCall
    ) {
        feedbackRepository.save(feedback);
        log.info("🔄 [FEEDBACK] 상태 업데이트 → GENERATING (feedbackId={})", feedback.getId());

        try {
            FeedbackResponseDto response = aiCall.get();

            feedback.updateContent(
                    response.getAnalysisFeedback(),
                    response.getActionGuide(),
                    response.getGeneratedAt(),
                    GenerationStatus.COMPLETED
            );

            log.info("🎉 [FEEDBACK] 상태 → COMPLETED (feedbackId={})", feedback.getId());
            return response;

        } catch (Exception e) {
            log.error("❌ [FEEDBACK] 생성 실패 - error={}", e.getMessage());
            feedback.updateStatus(GenerationStatus.FAILED);
            return null;
        }
    }

    // 피드백 목록 조회
    public List<FeedbackListResponseDto> getFeedbackList(Long userId) {

        Child child = childRepository.findByUserId(userId)
                .orElseThrow(() -> new CustomException(ErrorCode.CHILD_NOT_FOUND));

        return conversationRepository.findAllByChildIdOrderByCreatedAtDesc(child.getId())
                .stream()
                .map(conversation -> feedbackRepository.findByConversationId(conversation.getId()).orElse(null))
                .filter(f -> f != null)
                .map(f -> FeedbackListResponseDto.builder()
                        .id(f.getId())
                        .date(f.getConversation().getCreatedAt().toLocalDate())
                        .title(f.getConversation().getStory().getTitle())
                        .status(f.getGenerationStatus())
                        .build())
                .toList();
    }

    // 피드백 상세 조회
    public FeedbackDetailResponseDto getFeedbackDetail(Long userId, Long feedbackId) {

        Child child = childRepository.findByUserId(userId)
                .orElseThrow(() -> new CustomException(ErrorCode.CHILD_NOT_FOUND));

        Feedback feedback = feedbackRepository.findById(feedbackId)
                .orElseThrow(() -> new CustomException(ErrorCode.FEEDBACK_NOT_FOUND));

        Conversation conversation = feedback.getConversation();

        if (!conversation.getChild().getId().equals(child.getId())) {
            throw new CustomException(ErrorCode.FEEDBACK_ACCESS_DENIED);
        }

        return FeedbackDetailResponseDto.builder()
                .id(feedback.getId())
                .title(conversation.getStory().getTitle())
                .conversationFeedback(feedback.getFeedbackContent())
                .actionGuide(feedback.getActionGuide())
                .build();
    }

    private boolean isFeedbackAlreadyGenerated(String sessionId) {
        boolean exists = feedbackRepository.existsByConversationId(sessionId);
        if (exists) {
            log.info("⚠️ 피드백이 이미 존재함 → 생성하지 않음 (sessionId={})", sessionId);
        }
        return exists;
    }
}
