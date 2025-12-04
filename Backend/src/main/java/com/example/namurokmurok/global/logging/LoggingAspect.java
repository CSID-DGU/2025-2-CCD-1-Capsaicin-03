package com.example.namurokmurok.global.logging;

import com.example.namurokmurok.global.security.CustomUserDetails;
import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.annotation.*;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

@Slf4j
@Aspect
@Component
public class LoggingAspect {

    // 요청 시작 시간 저장용
    private static final ThreadLocal<Long> startTime = new ThreadLocal<>();

    // 모든 @RestController 메서드 지정
    @Pointcut("within(@org.springframework.web.bind.annotation.RestController *)")
    public void restControllerMethods() {}

    // 컨트롤러 메서드 실행 전 요청 로깅
    @Before("restControllerMethods()")
    public void logRequest(JoinPoint joinPoint) {

        // 요청 시작 시간 기록
        startTime.set(System.currentTimeMillis());

        HttpServletRequest request =
                ((ServletRequestAttributes) RequestContextHolder.currentRequestAttributes())
                        .getRequest();

        String httpMethod = request.getMethod();
        String uri = request.getRequestURI();
        String queryString = request.getQueryString();

        String userIdPart = getUserIdString();

        // 최종 출력 로그 형식
        if (queryString != null) {
            log.info("[REQ] {} {}?{} {}", httpMethod, uri, queryString, userIdPart);
        } else {
            log.info("[REQ] {} {} {}", httpMethod, uri, userIdPart);
        }
    }

    // 컨트롤러 정상 응답 시 출력
    @AfterReturning(pointcut = "restControllerMethods()", returning = "response")
    public void logResponse(Object response) {

        HttpServletRequest request =
                ((ServletRequestAttributes) RequestContextHolder.currentRequestAttributes())
                        .getRequest();

        long durationMs = System.currentTimeMillis() - startTime.get();
        startTime.remove();

        String uri = request.getRequestURI();
        String userIdPart = getUserIdString();

        // 정상 응답은 기본적으로 상태 코드 200
        log.info("[RES] 200 {} ({}ms) {}", uri, durationMs, userIdPart);
    }

    // 컨트롤러에서 예외 발생 시 로깅
    @AfterThrowing(pointcut = "restControllerMethods()", throwing = "ex")
    public void logException(Exception ex) {

        HttpServletRequest request =
                ((ServletRequestAttributes) RequestContextHolder.currentRequestAttributes())
                        .getRequest();

        long durationMs = System.currentTimeMillis() - startTime.get();
        startTime.remove();

        String uri = request.getRequestURI();
        String userIdPart = getUserIdString();

        log.warn("[RES] ERROR {} ({}ms) {} message={}",
                uri,
                durationMs,
                userIdPart,
                ex.getMessage()
        );
    }

    // SecurityContext에서 userId만 꺼내오는 메서드
    private String getUserIdString() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();

        if (auth != null && auth.getPrincipal() instanceof CustomUserDetails user) {
            return "userId=" + user.getUserId();
        }

        return "";
    }
}
