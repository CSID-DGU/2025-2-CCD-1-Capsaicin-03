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

    // 모든 @RestController 메서드
    @Pointcut("within(@org.springframework.web.bind.annotation.RestController *)")
    public void restControllerMethods() {}

    @Before("restControllerMethods()")
    public void logRequest(JoinPoint joinPoint) {

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


     // SecurityContext에서 userId만 꺼내오는 메서드
    private String getUserIdString() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();

        if (auth != null && auth.getPrincipal() instanceof CustomUserDetails user) {
            return "userId=" + user.getUserId();
        }

        return "";
    }
}
