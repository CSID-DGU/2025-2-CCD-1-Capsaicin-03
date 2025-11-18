package com.example.namurokmurok.global.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.function.client.WebClient;

@Configuration
public class WebClientConfig {

    @Value("${fastapi.base-url}")
    private String fastapiBaseUrl;

    @Bean
    public WebClient fastApiClient() {
        return WebClient.builder()
                .baseUrl(fastapiBaseUrl)
                .build();
    }
}