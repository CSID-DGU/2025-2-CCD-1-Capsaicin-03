package com.example.namurokmurok.global.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.function.client.ExchangeStrategies;
import org.springframework.web.reactive.function.client.WebClient;

@Configuration
public class WebClientConfig {

    @Value("${fastapi.base-url}")
    private String fastapiBaseUrl;

    @Bean
    public WebClient fastApiClient() {

        ExchangeStrategies strategies = ExchangeStrategies.builder()
                .codecs(c -> c.defaultCodecs().maxInMemorySize(10 * 1024 * 1024)) // 10MB
                .build();

        return WebClient.builder()
                .baseUrl(fastapiBaseUrl)
                .exchangeStrategies(strategies)
                .build();
    }
}