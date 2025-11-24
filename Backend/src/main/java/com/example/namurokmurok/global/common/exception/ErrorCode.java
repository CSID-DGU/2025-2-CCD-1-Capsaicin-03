package com.example.namurokmurok.global.common.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public enum ErrorCode {

    // 기본
    USER_NOT_FOUND(HttpStatus.NOT_FOUND, "사용자를 찾을 수 없습니다."),
    INVALID_REQUEST(HttpStatus.BAD_REQUEST, "잘못된 요청입니다."),
    VALIDATION_FAILED(HttpStatus.BAD_REQUEST, "입력값이 유효하지 않습니다."),
    INTERNAL_SERVER_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "서버 내부 오류가 발생했습니다."),

    // JWT 검증 관련
    TOKEN_NOT_PROVIDED(HttpStatus.UNAUTHORIZED, "JWT 토큰이 제공되지 않았습니다."),
    MALFORMED_JWT(HttpStatus.UNAUTHORIZED, "JWT 형식이 잘못되었습니다."),
    INVALID_JWT_SECRET(HttpStatus.INTERNAL_SERVER_ERROR, "JWT 시크릿 키가 유효하지 않습니다."),
    MISSING_SECRET_KEY(HttpStatus.INTERNAL_SERVER_ERROR, "SUPABASE_JWT_SECRET이 설정되지 않았습니다."),
    INVALID_JWT_SIGNATURE(HttpStatus.UNAUTHORIZED, "JWT 서명이 유효하지 않습니다."),
    TOKEN_EXPIRED(HttpStatus.UNAUTHORIZED, "JWT 토큰이 만료되었습니다."),

    // child 관련
    CHILD_ALREADY_EXISTS(HttpStatus.BAD_REQUEST, "이미 등록된 아이가 있습니다."),
    CHILD_NOT_FOUND(HttpStatus.NOT_FOUND, "등록되지 않은 아이입니다"),
    CHILD_NOT_FOUND_FOR_USER(HttpStatus.NOT_FOUND, "등록된 아이가 없습니다."),

    // story 관련
    INVALID_CATEGORY(HttpStatus.BAD_REQUEST, "잘못된 카테고리입니다."),
    STORY_NOT_FOUND(HttpStatus.NOT_FOUND, "존재하지 않는 동화 입니다."),
    DIALOGUE_PAGE_NOT_FOUND(HttpStatus.NOT_FOUND, "대화 장면이 존재하지 않습니다."),
    INTRO_QUESTION_NOT_FOUND(HttpStatus.NOT_FOUND, "인트로 질문이 존재하지 않습니다"),
    ACTION_CARD_NOT_FOUND(HttpStatus.NOT_FOUND, "행동 카드가 존재하지 않습니다"),

    // conversation 관련
    CONVERSATION_NOT_FOUND(HttpStatus.NOT_FOUND, "존재하지 않는 대화입니다"),

    // Audio & File 관련
    AUDIO_CONVERSION_FAILED(HttpStatus.INTERNAL_SERVER_ERROR, "오디오 파일 변환에 실패했습니다."),
    FILE_SYSTEM_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "파일 입출력 처리 중 오류가 발생했습니다.");
    ;

    private final HttpStatus status;
    private final String message;

    ErrorCode(HttpStatus status, String message) {
        this.status = status;
        this.message = message;
    }
}