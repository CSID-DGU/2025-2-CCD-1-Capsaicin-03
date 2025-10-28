package com.example.namurokmurok.domain.user.controller;

import com.example.namurokmurok.domain.user.dto.ChildRequestDto;
import com.example.namurokmurok.domain.user.dto.ChildResponseDto;
import com.example.namurokmurok.domain.user.service.UserService;
import com.example.namurokmurok.global.common.response.ApiResponse;
import com.example.namurokmurok.global.security.CustomUserDetails;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;


@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {
    private final UserService userService;

    @PostMapping("/children")
    @Operation(
            summary = "아이 등록 API",
            description = "현재 로그인한 부모 사용자가 아이 프로필을 등록합니다.")
    public ApiResponse<ChildResponseDto> registerChild(
            @AuthenticationPrincipal CustomUserDetails userPrincipal,
            @Valid @RequestBody ChildRequestDto requestDto
    ) {
        ChildResponseDto response = userService.registerChild(userPrincipal.getSub(), requestDto);
        return ApiResponse.success(response);
    }
}
