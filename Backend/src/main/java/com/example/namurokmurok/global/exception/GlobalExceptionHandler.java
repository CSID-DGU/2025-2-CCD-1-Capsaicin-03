package com.example.namurokmurok.global.exception;

import com.example.namurokmurok.global.common.response.ApiResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

    // 커스텀 예외 처리
    @ExceptionHandler(CustomException.class)
    public ResponseEntity<ApiResponse<?>> handleCustomException(CustomException e) {
        return ResponseEntity
                .status(e.getErrorCode().getStatus())
                .body(ApiResponse.fail(e.getErrorCode().getMessage()));
    }

    // @Valid 검증 실패 처리
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<?>> handleValidationException(MethodArgumentNotValidException e) {
        String errorMessage = e.getBindingResult()
                .getFieldErrors()
                .stream()
                .findFirst()
                .map(fieldError -> fieldError.getDefaultMessage())
                .orElse(ErrorCode.VALIDATION_FAILED.getMessage());

        return ResponseEntity
                .status(ErrorCode.VALIDATION_FAILED.getStatus())
                .body(ApiResponse.fail(errorMessage));
    }


    // LocalDate 변환 실패 등 JSON 파싱 오류 처리
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiResponse<?>> handleInvalidFormat(HttpMessageNotReadableException e) {
        // 날짜 변환 실패 케이스만 별도로 처리
        if (e.getMessage() != null && e.getMessage().contains("LocalDate")) {
            return ResponseEntity
                    .badRequest()
                    .body(ApiResponse.fail("생년월일 형식이 올바르지 않습니다. (yyyy-MM-dd)"));
        }

        // 그 외 잘못된 JSON 구조나 타입 불일치 등
        return ResponseEntity
                .badRequest()
                .body(ApiResponse.fail("요청 형식이 올바르지 않습니다."));
    }

    // 그 외 예상치 못한 예외
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<?>> handleGeneralException(Exception e) {
        e.printStackTrace(); //에러 로그 출력
        return ResponseEntity
                .status(500)
                .body(ApiResponse.fail("서버 내부 오류가 발생했습니다."));
    }
}