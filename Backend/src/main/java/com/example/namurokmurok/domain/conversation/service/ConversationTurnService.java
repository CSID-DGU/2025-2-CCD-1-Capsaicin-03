package com.example.namurokmurok.domain.conversation.service;

import com.example.namurokmurok.domain.conversation.dto.ConversationTurnResponse;
import com.example.namurokmurok.domain.conversation.dto.DialogueTurnRequest;
import com.example.namurokmurok.domain.conversation.dto.DialogueTurnResponse;
import com.example.namurokmurok.domain.conversation.entity.Conversation;
import com.example.namurokmurok.domain.conversation.entity.Dialogue;
import com.example.namurokmurok.domain.conversation.enums.ConversationStatus;
import com.example.namurokmurok.domain.conversation.enums.Speaker;
import com.example.namurokmurok.domain.conversation.enums.Stage;
import com.example.namurokmurok.domain.conversation.repository.ConversationRepository;
import com.example.namurokmurok.domain.conversation.repository.DialogueRepository;
import com.example.namurokmurok.domain.feedback.service.FeedbackService;
import com.example.namurokmurok.domain.story.repository.StoryRepository;
import com.example.namurokmurok.domain.user.repository.ChildRepository;
import com.example.namurokmurok.global.audio.AudioConverter;
import com.example.namurokmurok.global.audio.AudioValidationService;
import com.example.namurokmurok.global.client.AiApiClient;
import com.example.namurokmurok.global.common.exception.CustomException;
import com.example.namurokmurok.global.common.exception.ErrorCode;
import com.example.namurokmurok.global.s3.S3Uploader;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class ConversationTurnService {

    private final DialogueRepository dialogueRepository;
    private final ConversationRepository conversationRepository;
    private final ChildRepository childRepository;
    private final StoryRepository storyRepository;

    private final AiApiClient aiApiClient;
    private final AudioConverter audioConverter;
    private final AudioValidationService audioValidationService;
    private final S3Uploader s3Uploader;

    private final FeedbackService feedbackService;

    /**
     * 실시간 대화 턴 처리 (메인 로직)
     *
     * - DB 조회/업데이트는 짧은 트랜잭션 메서드에서만 처리
     * - 오디오 변환, AI 호출, S3 업로드는 트랜잭션 밖에서 수행하여
     *   DB 커넥션 풀 점유 시간을 최소화
     */
    public ConversationTurnResponse processTurn(
            Long childId, Long storyId, Stage stage, String sessionId, MultipartFile webmAudio
    ) {
        log.info("[ProcessTurn] Start - session={}, stage={}, childId={}", sessionId, stage, childId);

        // 1. 기본 검증 및 대화 상태 갱신
        validateAndMarkInProgress(childId, storyId, sessionId);

        // 2. 오디오 변환
        File wavFile = audioConverter.convertWebmToWav(webmAudio);

        // 오디오 무음 감지시 예외처리
        if (audioValidationService.isSilent(wavFile)) {
            log.warn("[ProcessTurn] Silent audio detected. session={}, stage={}", sessionId, stage);
            throw new CustomException(ErrorCode.SILENT_AUDIO_DETECTED);
        }

        // 3. AI 서버 요청
        DialogueTurnResponse aiRes = requestToAiServer(sessionId, stage, wavFile);

        // 4. 현재 Retry 횟수
        int currentRetryCount = aiRes.getRetryCount();

        // 5. TTS 업로드
        String ttsUrl = uploadTtsAudio(aiRes, sessionId, stage, currentRetryCount);

        // 6. 종료 여부 판단
        boolean isEnd = determineIsEnd(stage, aiRes);

        // 7. 대화 로그 저장 및 상태 갱신
        saveTurnAndUpdateConversation(sessionId, stage, currentRetryCount, aiRes, ttsUrl, isEnd);

        // 8. 종료 시 비동기 피드백 생성 트리거
        if (isEnd) {
            log.info("[FeedbackTrigger] Conversation completed. Triggering feedback generation...");
            feedbackService.createFeedbackAsync(sessionId);
        }

        // 9. 다음 스테이지 결정
        String nextStageName = aiRes.getNextStage();
        if (isEnd) {
            nextStageName = null; // 종료 시 다음 스테이지 없음
        }

        log.info("[ProcessTurn] Completed. Session={}, Current={}, Next={}, isEnd={}",
                sessionId, stage, nextStageName, isEnd);

        // 10. 응답 생성
        return ConversationTurnResponse.builder()
                .sessionId(sessionId)
                .currentStage(stage)      // 현재 스테이지
                .nextStage(nextStageName) // 다음 스테이지 (String)
                .sttText(aiRes.getResult().getSttResult().getText())
                .aiText(aiRes.getResult().getAiResponse().getText())
                .ttsAudioUrl(ttsUrl)
                .end(isEnd)
                .build();
    }

    // ------------------------------------
    // Private Helper Methods

    /**
     * 1. 엔티티 존재 검증 + 첫 발화 시 상태 IN_PROGRESS로 변경
     */
    @Transactional
    protected void validateAndMarkInProgress(Long childId, Long storyId, String sessionId) {
        childRepository.findById(childId)
                .orElseThrow(() -> new CustomException(ErrorCode.CHILD_NOT_FOUND));

        storyRepository.findById(storyId)
                .orElseThrow(() -> new CustomException(ErrorCode.STORY_NOT_FOUND));

        Conversation conversation = conversationRepository.findById(sessionId)
                .orElseThrow(() -> new CustomException(ErrorCode.CONVERSATION_NOT_FOUND));

        // 아이의 첫 발화 시점에 대화 상태 IN_PROGRESS 로 변경
        if (conversation.getStatus() == ConversationStatus.STARTED) {
            conversation.updateStatus(ConversationStatus.IN_PROGRESS);
            log.info("[Conversation] Status updated → IN_PROGRESS, session={}", sessionId);
        }
    }

    // 3. AI 서버 통신
    private DialogueTurnResponse requestToAiServer(String sessionId, Stage stage, File wavFile) {
        DialogueTurnRequest aiReq = DialogueTurnRequest.builder()
                .sessionId(sessionId)
                .stage(stage)
                .audioFile(wavFile)
                .build();

        log.info("[ProcessTurn] Sending request to AI Model Server...");
        DialogueTurnResponse aiRes = aiApiClient.sendTurn(aiReq);

        try {
            String rawTts = aiRes.getResult().getAiResponse().getTtsAudio();
            log.warn("[DEBUG] RAW TTS AUDIO (first 200 chars) = {}",
                    rawTts != null ? rawTts.substring(0, Math.min(200, rawTts.length())) : "null");
        } catch (Exception e) {
            log.warn("[DEBUG] RAW TTS AUDIO LOGGING FAILED: {}", e.getMessage());
        }

        if (aiRes == null || aiRes.getResult() == null) {
            log.warn("[ProcessTurn] AI Response is null or empty.");
        }
        return aiRes;
    }

    // 5. S3 업로드 로직
    private String uploadTtsAudio(DialogueTurnResponse aiRes, String sessionId, Stage stage, int currentRetryCount) {

        DialogueTurnResponse.AiResponse ai = aiRes.getResult().getAiResponse();

        if (ai.getTtsAudioBase64() != null && !ai.getTtsAudioBase64().isEmpty()) {
            log.info("[TTS] Base64 detected. Uploading to S3...");

            byte[] audioBytes = java.util.Base64.getDecoder().decode(ai.getTtsAudioBase64());

            String fileName = String.format("conversation/%s/%s_retry%d.wav",
                    sessionId,
                    stage.name(),
                    currentRetryCount
            );

            return s3Uploader.uploadBytes(audioBytes, fileName);
        }

        return null;
    }

    // 7. 종료 조건 판단
    /**
     * [Stage 6]
     * - next_stage == null → 종료
     */
    private boolean determineIsEnd(Stage stage, DialogueTurnResponse aiRes) {

        String nextStage = aiRes.getNextStage();

        // Stage 1~5: 종료 없음
        if (stage != Stage.S6) {
            return false;
        }

        // Stage 6: next_stage == null → 종료
        if (nextStage == null) {
            log.info("[Logic] S6 & next_stage=null → End conversation.");
            return true;
        }

        // Stage 6: next_stage != null → 종료 아님
        log.info("[Logic] S6 & next_stage exists → Continue conversation.");
        return false;
    }

    /**
     * 7. 로그 저장 + 대화 상태 COMPLETED 처리
     */
    @Transactional
    protected void saveTurnAndUpdateConversation(
            String sessionId,
            Stage stage,
            int retryCount,
            DialogueTurnResponse aiRes,
            String ttsUrl,
            boolean isEnd
    ) {
        Conversation conversation = conversationRepository.findById(sessionId)
                .orElseThrow(() -> new CustomException(ErrorCode.CONVERSATION_NOT_FOUND));

        LocalDateTime now = LocalDateTime.now();

        // 종료시 COMPLETED & endedAt 저장
        if (isEnd) {
            conversation.updateStatus(ConversationStatus.COMPLETED);
            conversation.updateEndedAt(now);
            log.info("[Conversation] Status updated → COMPLETED, endedAt saved. session={}", sessionId);
        }

        // 해당 Conversation의 마지막 turn_number 조회
        Integer lastTurn = dialogueRepository.findMaxTurnNumberByConversationId(conversation.getId());
        if (lastTurn == null) lastTurn = 0;
        int nextTurn = lastTurn + 1;

        // safety 정보 (아이 발화에 대한 판단)
        boolean childSafe = true;
        String unsafeReason = null;

        if (aiRes.getResult() != null && aiRes.getResult().getSafetyCheck() != null) {
            childSafe = aiRes.getResult().getSafetyCheck().isSafe();
            unsafeReason = aiRes.getResult().getSafetyCheck().getMessage();
        }

        // Emotion Null-safe 처리
        String primaryEmotion = null;
        if (aiRes.getDetectedEmotion() != null) {
            primaryEmotion = aiRes.getDetectedEmotion().getPrimary();
        }

        // CHILD 로그 (아이 발화)
        Dialogue childLog = Dialogue.builder()
                .conversation(conversation)
                .turnNumber(nextTurn)
                .stage(stage)
                .retryCount(retryCount)
                .speaker(Speaker.CHILD)
                .content(aiRes.getResult().getSttResult().getText())
                .audioUrl(null)
                .createdAt(now)
                .isSafe(childSafe)
                .unsafeReason(unsafeReason)
                .emotion(primaryEmotion)
                .fallbackTriggered(aiRes.isFallbackTriggered())
                .build();

        // AI 로그 (AI 응답)
        Dialogue aiLog = Dialogue.builder()
                .conversation(conversation)
                .turnNumber(nextTurn + 1)
                .stage(stage)
                .retryCount(retryCount)
                .speaker(Speaker.AI)
                .content(aiRes.getResult().getAiResponse().getText())
                .audioUrl(ttsUrl)
                .createdAt(now.plusNanos(1_000_000))
                .isSafe(true)          // AI 답변은 기본적으로 safe 처리
                .unsafeReason(null)
                .emotion(null)
                .fallbackTriggered(false)
                .build();

        dialogueRepository.saveAll(List.of(childLog, aiLog));
    }
}
