package com.example.namurokmurok.global.client;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

@Slf4j
@Component
@RequiredArgsConstructor
public class AiApiClient {

    private final WebClient fastApiClient;

    /**
     * FastAPI에 x-www-form-urlencoded POST 요청
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
}
