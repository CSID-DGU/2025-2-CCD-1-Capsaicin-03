package com.example.namurokmurok.domain.feedback.controller;

import com.example.namurokmurok.domain.feedback.dto.FeedbackDetailResponseDto;
import com.example.namurokmurok.domain.feedback.dto.FeedbackListResponseDto;
import com.example.namurokmurok.domain.feedback.service.FeedbackService;
import com.example.namurokmurok.global.common.response.ApiResponse;
import com.example.namurokmurok.global.security.CustomUserDetails;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;


@RestController
@RequestMapping("/api/feedback")
@RequiredArgsConstructor
@Tag(name = "Feedback", description = "피드백 관련 API")
public class FeedbackController {

    private final FeedbackService feedbackService;

    @GetMapping()
    @Operation(summary = "피드백 목록 조회",
            description = "현재 로그인한 사용자 아이에 대한 피드백 목록입니다. 생성된 피드백만 조회됩니다.")
    public ApiResponse<List<FeedbackListResponseDto>> getFeedbackList(@AuthenticationPrincipal CustomUserDetails userPrincipal){
        return ApiResponse.success(feedbackService.getFeedbackList(userPrincipal.getUserId()));
    }

    @GetMapping("/{feedback-id}")
    @Operation(summary = "피드백 상세 조회",
            description = "{feedback-id}의 피드백 상세 내용을 조회합니다.")
    public ApiResponse<FeedbackDetailResponseDto> getFeedbackDetail(
            @AuthenticationPrincipal CustomUserDetails userPrincipal,
            @PathVariable("feedback-id") Long feedbackId
    ){
        return ApiResponse.success(feedbackService.getFeedbackDetail(userPrincipal.getUserId(), feedbackId));
    }
}
