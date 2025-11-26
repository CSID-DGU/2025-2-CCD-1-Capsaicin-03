package com.example.namurokmurok.domain.feedback.service;

import com.example.namurokmurok.domain.conversation.entity.Conversation;
import com.example.namurokmurok.domain.conversation.repository.ConversationRepository;
import com.example.namurokmurok.domain.feedback.dto.FeedbackResponseDto;
import com.example.namurokmurok.domain.feedback.entity.Feedback;
import com.example.namurokmurok.domain.feedback.repository.FeedbackRepository;
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

@Slf4j
@Service
@RequiredArgsConstructor
public class FeedbackService {

    private final ConversationRepository conversationRepository;
    private final FeedbackRepository feedbackRepository;

    private final AiApiClient aiApiClient;

    @Async
    @Transactional
    public void createFeedbackAsync(String sessionId) {
        log.info("🔄 [ASYNC] 피드백 생성 비동기 작업 시작 sessionId={}", sessionId);
        try {
            createFeedback(sessionId);
            log.info("✅ [ASYNC] 피드백 생성 완료 sessionId={}", sessionId);
        } catch (Exception e) {
            log.error("❌ [ASYNC] 피드백 생성 실패 sessionId={}, error={}", sessionId, e.getMessage());
        }
    }

    @Transactional
    public FeedbackResponseDto createFeedback(String sessionId) {

        log.info("📌 [FEEDBACK] 피드백 생성 요청 시작 - sessionId={}", sessionId);

        Conversation conversation = conversationRepository.findById(sessionId)
                .orElseThrow(() -> new CustomException(ErrorCode.CONVERSATION_NOT_FOUND));

        Feedback feedback = Feedback.builder()
                .conversation(conversation)
                .generationStatus(GenerationStatus.GENERATING) // 생성 상태 GENERATING
                .createdAt(LocalDateTime.now())
                .build();

        feedbackRepository.save(feedback);

        log.info("🔄 [FEEDBACK] 상태 업데이트 → GENERATING (sessionId={})", sessionId);

        try {
            // AI 서버 호출
            FeedbackResponseDto response = aiApiClient.generateAiFeedback(sessionId);

            log.info("✅ [FEEDBACK] AI 피드백 생성 성공 - sessionId={}", sessionId);

            feedback.updateContent(
                    response.getAnalysisFeedback(),
                    response.getActionGuide(),
                    response.getGeneratedAt(),
                    GenerationStatus.COMPLETED // 생성 상태 COMPLETED로 변경
            );

            log.info("🎉 [FEEDBACK] 상태 업데이트 → COMPLETED (sessionId={})", sessionId);

            return response;

        } catch (Exception e) {

            log.error("❌ [FEEDBACK] 피드백 생성 실패 - sessionId={}, error={}",
                    sessionId, e.getMessage());

            // 실패 시 상태 = FAILED
            feedback.updateStatus(GenerationStatus.FAILED);

            log.warn("⚠️ [FEEDBACK] 상태 업데이트 → FAILED (sessionId={})", sessionId);

            throw e;
        }
    }
}
