package com.example.namurokmurok.domain.user.controller;

import com.example.namurokmurok.domain.user.dto.ChildRequestDto;
import com.example.namurokmurok.domain.user.dto.ChildResponseDto;
import com.example.namurokmurok.domain.user.service.UserService;
import com.example.namurokmurok.global.common.response.ApiResponse;
import com.example.namurokmurok.global.security.CustomUserDetails;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;


@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@Tag(name = "User", description = "사용자 관련 API")
public class UserController {
    private final UserService userService;

    @PostMapping("/children")
    @Operation(
            summary = "아이 등록 API",
            description = "현재 로그인한 부모 사용자가 아이 프로필을 등록합니다.")
    public ApiResponse<Long> registerChild(
            @AuthenticationPrincipal CustomUserDetails userPrincipal,
            @Valid @RequestBody ChildRequestDto requestDto
    ) {
        return ApiResponse.success(userService.registerChild(userPrincipal.getSub(), requestDto));
    }
}
