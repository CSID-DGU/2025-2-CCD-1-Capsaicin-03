package com.example.namurokmurok.global.client;

import com.example.namurokmurok.domain.conversation.dto.DialogueTurnRequest;
import com.example.namurokmurok.domain.conversation.dto.DialogueTurnResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.FileSystemResource;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.http.client.MultipartBodyBuilder;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartException;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;


@Slf4j
@Component
@RequiredArgsConstructor
public class AiApiClient {

    private final WebClient fastApiClient;

    /**
     * FastAPI에 x-www-form-urlencoded POST 요청 (세션 시작)
     */
    public <T> T postForm(String uri,
                          BodyInserters.FormInserter<String> body,
                          Class<T> responseType) {

        return fastApiClient.post()
                .uri(uri)
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .body(body)
                .retrieve()
                .onStatus(HttpStatusCode::isError, clientResponse ->
                        clientResponse.bodyToMono(String.class)
                                .flatMap(errorBody -> {
                                    log.error("❌ AI 서버 오류 [{}]: {}", uri, errorBody);
                                    return Mono.error(
                                            new RuntimeException("AI Server Error: " + errorBody)
                                    );
                                })
                )
                .bodyToMono(responseType)
                .block();
    }

    /**
     * 실시간 대화 처리용 multipart/form-data POST
     */
    public DialogueTurnResponse sendTurn(DialogueTurnRequest req) {

        MultipartBodyBuilder builder = new MultipartBodyBuilder();
        builder.part("session_id", req.getSessionId());
        builder.part("stage", req.getStage().name());
        //builder.part("intro_question", req.getIntroQuestion());
        builder.part("audio_file", new FileSystemResource(req.getAudioFile()))
                .contentType(MediaType.APPLICATION_OCTET_STREAM);

        return fastApiClient.post()
                .uri("/api/v1/dialogue/turn")
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .body(BodyInserters.fromMultipartData(builder.build()))
                .retrieve()
                .onStatus(HttpStatusCode::isError, clientResponse ->
                        clientResponse.bodyToMono(String.class)
                                .flatMap(errorBody -> {
                                    log.error("❌ AI 서버 오류 [/turn]: {}", errorBody);
                                    return Mono.error(new MultipartException(errorBody));
                                })
                )
                .bodyToMono(DialogueTurnResponse.class)
                .block();
    }
}
