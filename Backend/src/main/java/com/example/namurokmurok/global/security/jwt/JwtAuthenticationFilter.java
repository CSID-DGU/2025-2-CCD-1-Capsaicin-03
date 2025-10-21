package com.example.namurokmurok.global.security.jwt;

import com.example.namurokmurok.global.security.CustomUserDetails;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;
import java.util.Map;

/**
 * Supabase JWT 검증 필터 (레거시 HS256용)
 *  - Authorization 헤더에서 Bearer 토큰 추출
 *  - SupabaseJwtValidator로 HS256 토큰 검증
 *  - 검증 성공 시 SecurityContext에 사용자 정보 저장
 */
@Slf4j
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final SupabaseJwtValidator validator;

    public JwtAuthenticationFilter(SupabaseJwtValidator validator) {
        this.validator = validator;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain) throws ServletException, IOException {
        try {
            // Authorization 헤더 추출
            String authHeader = request.getHeader("Authorization");

            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                filterChain.doFilter(request, response);
                return;
            }

            // JWT 토큰 파싱
            String token = authHeader.substring(7).trim();

            // JWT 검증 (Supabase HS256)
            Map<String, Object> claims = validator.validateAndGetClaims(token);

            // 기본 정보 추출
            String email = (String) claims.get("email");
            String sub = (String) claims.get("sub");
            String username = (String) ((Map)claims.get("user_metadata")).get("full_name");

            if (email != null && sub != null) {
                // CustomUserDetails 생성 및 인증 객체 구성
                CustomUserDetails userDetails = new CustomUserDetails(email, sub, username);
                UsernamePasswordAuthenticationToken authentication =
                        new UsernamePasswordAuthenticationToken(
                                userDetails, null, Collections.emptyList());
                authentication.setDetails(
                        new WebAuthenticationDetailsSource().buildDetails(request));

                // SecurityContext에 저장
                SecurityContextHolder.getContext().setAuthentication(authentication);
                log.debug("✅ JWT 인증 성공 - email={}", email);
            }

        } catch (Exception e) {
            log.warn("❌ JWT 검증 실패: {}", e.getMessage());
        }

        // 다음 필터로 요청 전달
        filterChain.doFilter(request, response);
    }
}
