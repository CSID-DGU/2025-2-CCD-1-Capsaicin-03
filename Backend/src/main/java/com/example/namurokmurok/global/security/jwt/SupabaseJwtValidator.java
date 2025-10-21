package com.example.namurokmurok.global.security.jwt;

import com.example.namurokmurok.global.exception.CustomException;
import com.example.namurokmurok.global.exception.ErrorCode;
import com.nimbusds.jose.JOSEException;
import com.nimbusds.jose.JWSVerifier;
import com.nimbusds.jose.KeyLengthException;
import com.nimbusds.jose.crypto.MACVerifier;
import com.nimbusds.jwt.SignedJWT;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.text.ParseException;
import java.util.Date;
import java.util.Map;

/**
 * Supabase Legacy JWT 검증 (HS256)
 */
@Slf4j
@Component
public class SupabaseJwtValidator {

    @Value("${SUPABASE_JWT_SECRET}")
    private String supabaseJwtSecret;

    /**
     * Supabase JWT를 검증하고 Payload(Claims)를 반환
     */
    public Map<String, Object> validateAndGetClaims(String token) {
        try {
            // 토큰 유효성 확인
            if (token == null || token.isBlank()) {
                throw new CustomException(ErrorCode.TOKEN_NOT_PROVIDED);
            }

            // 시크릿 키 유효성 확인
            if (supabaseJwtSecret == null || supabaseJwtSecret.isBlank()) {
                throw new CustomException(ErrorCode.MISSING_SECRET_KEY);
            }

            // JWT 파싱
            SignedJWT signedJWT;
            try {
                signedJWT = SignedJWT.parse(token);
            } catch (ParseException e) {
                throw new CustomException(ErrorCode.MALFORMED_JWT);
            }

            // HS256 서명 검증
            try {
                JWSVerifier verifier = new MACVerifier(supabaseJwtSecret.getBytes(StandardCharsets.UTF_8));
                boolean verified = signedJWT.verify(verifier);
                if (!verified) {
                    throw new CustomException(ErrorCode.INVALID_JWT_SIGNATURE);
                }
            } catch (KeyLengthException e) {
                throw new CustomException(ErrorCode.INVALID_JWT_SECRET);
            } catch (JOSEException e) {
                throw new CustomException(ErrorCode.INVALID_JWT_SIGNATURE);
            }

            // 만료 시간 확인
            Date expiration = signedJWT.getJWTClaimsSet().getExpirationTime();
            if (expiration.before(new Date())) {
                throw new CustomException(ErrorCode.TOKEN_EXPIRED);
            }

            // Claim 추출
            Map<String, Object> claims = signedJWT.getJWTClaimsSet().getClaims();
            log.info("✅ JWT 검증 성공 - email={}, sub={}, exp={}",
                    claims.get("email"), claims.get("sub"), expiration);

            return claims;

        } catch (CustomException e) {
            throw e;
        } catch (Exception e) {
            log.error("❌ JWT 검증 실패 (Unhandled): {}", e.getMessage());
            throw new CustomException(ErrorCode.INTERNAL_SERVER_ERROR);
        }
    }
}
