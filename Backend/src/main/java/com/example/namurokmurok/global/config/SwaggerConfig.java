package com.example.namurokmurok.global.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class SwaggerConfig {

    @Bean
    public OpenAPI openAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("나무럭무럭 API 문서")
                        .description("나무럭무럭 프로젝트의 REST API 명세서입니다.")
                        .version("v1.0.0")
                );
    }
}
