package com.example.namurokmurok.domain.story.controller;

import com.example.namurokmurok.domain.story.dto.*;
import com.example.namurokmurok.domain.story.enums.SelCategory;
import com.example.namurokmurok.domain.story.service.StoryService;
import com.example.namurokmurok.global.common.response.ApiResponse;
import com.example.namurokmurok.global.security.CustomUserDetails;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/stories")
@RequiredArgsConstructor
@Tag(name = "Story", description = "동화 관련 API")
public class StoryController {

    private final StoryService storyService;

    @GetMapping()
    @Operation(summary = "카테고리별 동화 목록 조회",
            description = "CASEL 역량 코드(category)에 해당하는 동화 목록을 조회합니다.")
    public ApiResponse<StoryListResponseDto> getStoriesByCategory(@Parameter(description = "CASEL 역량 코드", example = "SA")
                                                                  @RequestParam SelCategory category){
        StoryListResponseDto response = storyService.getStoriesByCategory(category);
        return ApiResponse.success(response);
    }

    @GetMapping("/{story-id}")
    @Operation(summary = "동화 상세 조회",
            description = "story-id에 해당하는 동화의 상세 정보를 조회합니다.")
    public ApiResponse<StoryInfoResponseDto> getStoryDetail(
            @Parameter(description = "동화 ID", example = "1")
            @PathVariable("story-id") Long storyId) {

        StoryInfoResponseDto response = storyService.getStoryDetail(storyId);
        return ApiResponse.success(response);
    }

    @GetMapping("/{story-id}/scene")
    @Operation(summary = "동화별 대화 장면 조회",
            description = "story-id에 해당하는 대화 장면 정보를 조회합니다.")
    public ApiResponse<DialogueSceneResponseDto> getDialogueScene(
            @Parameter(description = "동화 ID", example = "1")
            @PathVariable("story-id") Long storyId) {

        DialogueSceneResponseDto response = storyService.getDialogueScene(storyId);
        return ApiResponse.success(response);
    }

    @GetMapping("/{story-id}/intro-question")
    @Operation(summary = "동화별 인트로 질문 조회",
            description = "story-id에 해당하는 인트로 질문 정보를 조회합니다.")
    public ApiResponse<IntroQuestionResponseDto> getIntroQuestion(
            @Parameter(description = "동화 ID", example = "1")
            @PathVariable("story-id") Long storyId,
            @AuthenticationPrincipal CustomUserDetails user) {

        Long userId = user.getUserId();

        IntroQuestionResponseDto response = storyService.getIntroQuestion(storyId, userId);
        return ApiResponse.success(response);
    }

    @GetMapping("/{story-id}/action-card")
    @Operation(summary = "동화별 행동카드 정보 조회",
            description = "story-id에 해당하는 행동 카드 정보를 조회합니다.")
    public ApiResponse<ActionCardResponseDto> getActionCard(
            @Parameter(description = "동화 ID", example = "1")
            @PathVariable("story-id") Long storyId) {

        ActionCardResponseDto response = storyService.getActionCard(storyId);
        return ApiResponse.success(response);
    }
}
