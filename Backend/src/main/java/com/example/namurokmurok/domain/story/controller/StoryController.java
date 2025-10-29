package com.example.namurokmurok.domain.story.controller;

import com.example.namurokmurok.domain.story.dto.StoryListResponseDto;
import com.example.namurokmurok.domain.story.enums.SelCategory;
import com.example.namurokmurok.domain.story.service.StoryService;
import com.example.namurokmurok.global.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

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
}
