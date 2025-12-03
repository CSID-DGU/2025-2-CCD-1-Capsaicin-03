package com.example.namurokmurok.global.client;

import com.example.namurokmurok.domain.conversation.dto.SessionStartResponse;
import com.example.namurokmurok.domain.conversation.dto.SessionStartRequest;
import com.example.namurokmurok.domain.conversation.dto.DialogueTurnRequest;
import com.example.namurokmurok.domain.conversation.dto.DialogueTurnResponse;
import com.example.namurokmurok.domain.feedback.dto.FeedbackFromHistoryRequestDto;
import com.example.namurokmurok.domain.feedback.dto.FeedbackResponseDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.FileSystemResource;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.http.client.MultipartBodyBuilder;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.ClientResponse;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

@Slf4j
@Component
@RequiredArgsConstructor
public class AiApiClient {

    private final WebClient fastApiClient;

    /**
     * 공통 에러 처리
     */
    private <T> Mono<T> handleException(String path, Throwable e) {
        log.error("❌ AI 요청 실패 [{}]: {}", path, e.getMessage());
        return Mono.error(new RuntimeException("AI Request Error (" + path + "): " + e.getMessage(), e));
    }

    /**
     * 공통 HTTP Status 에러 처리
     */
    private <T> Mono<T> handleStatusError(String path, ClientResponse res) {
        return res.bodyToMono(String.class)
                .flatMap(body -> {
                    log.error("❌ AI 서버 오류 [{}]: {}", path, body);
                    return Mono.error(new RuntimeException("AI Server Error: " + body));
                });
    }

    /**
     * 세션 발급 요청
     */
    public SessionStartResponse startSession(SessionStartRequest req) {

        BodyInserters.FormInserter<String> formData = BodyInserters
                .fromFormData("story_name", req.getStory_name())
                .with("child_name", req.getChild_name())
                .with("child_age", String.valueOf(req.getChild_age()))
                .with("intro", req.getIntro());

        return fastApiClient.post()
                .uri("/api/v1/dialogue/session/start")
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .body(formData)
                .retrieve()
                .onStatus(HttpStatusCode::isError,
                        res -> handleStatusError("/session/start", res))
                .bodyToMono(SessionStartResponse.class)
                .onErrorResume(e -> handleException("/session/start", e))
                .block();
    }

    /**
     * 실시간 턴 전송 (multipart/form-data)
     */
    public DialogueTurnResponse sendTurn(DialogueTurnRequest req) {

        MultipartBodyBuilder builder = new MultipartBodyBuilder();
        builder.part("session_id", req.getSessionId());
        builder.part("stage", req.getStage().name());
        builder.part("audio_file", new FileSystemResource(req.getAudioFile()))
                .contentType(MediaType.APPLICATION_OCTET_STREAM);

        return fastApiClient.post()
                .uri("/api/v1/dialogue/turn")
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .body(BodyInserters.fromMultipartData(builder.build()))
                .retrieve()
                .onStatus(HttpStatusCode::isError,
                        res -> handleStatusError("/turn", res))
                .bodyToMono(DialogueTurnResponse.class)
                .onErrorResume(e -> handleException("/turn", e))
                .block();
    }

    /**
     * 피드백 생성 요청 (세션 유효시)
     */
    public FeedbackResponseDto generateAiFeedback(String sessionId) {

        BodyInserters.FormInserter<String> formData = BodyInserters
                .fromFormData("session_id", sessionId);

        return fastApiClient.post()
                .uri("/api/v1/dialogue/feedback")
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .body(formData)
                .retrieve()
                .onStatus(HttpStatusCode::isError,
                        res -> handleStatusError("/feedback", res))
                .bodyToMono(FeedbackResponseDto.class)
                .onErrorResume(e -> handleException("/feedback", e))
                .block();
    }

    /**
     * 피드백 생성 요청 (세션 만료의 경우로, 대화 로그 포함 요청)
     */

    public FeedbackResponseDto generateFeedbackFromHistory(FeedbackFromHistoryRequestDto requestDto) {
        return fastApiClient.post()
                .uri("/api/v1/dialogue/feedback/generate")
                .bodyValue(requestDto)
                .retrieve()
                .bodyToMono(FeedbackResponseDto.class)
                .block();
    }
}
