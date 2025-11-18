package com.example.namurokmurok.global.security.jwt;

import com.example.namurokmurok.global.common.response.ApiResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Component
public class JwtAuthenticationEntryPoint implements AuthenticationEntryPoint {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public void commence(HttpServletRequest request, HttpServletResponse response,
                         AuthenticationException authException) throws IOException {

        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED); // 401
        response.setContentType("application/json; charset=UTF-8");

        ApiResponse<?> errorResponse = ApiResponse.fail("JWT 토큰이 누락되었거나 유효하지 않습니다.");
        response.getWriter().write(objectMapper.writeValueAsString(errorResponse));
    }
}