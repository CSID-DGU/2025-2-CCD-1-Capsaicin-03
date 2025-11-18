package com.example.namurokmurok.domain.conversation.controller;


import com.example.namurokmurok.domain.conversation.dto.ConversationTurnResponse;
import com.example.namurokmurok.domain.conversation.enums.Stage;
import com.example.namurokmurok.domain.conversation.service.ConversationTurnService;
import com.example.namurokmurok.global.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;


@RestController
@RequiredArgsConstructor
@RequestMapping("/api/conversations")
@Tag(name = "Conversation", description = "대화 관련 API")
public class ConversationController {

    private final ConversationTurnService conversationTurnService;

    @PostMapping(
            value = "/turn",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE
    )
    @Operation(
            summary = "실시간 대화 API",
            description = "아이와 AI의 대화 API입니다.")
    public ApiResponse<ConversationTurnResponse> handleTurn(
            @Parameter(description = "대화 세션 ID", example = "550e8400-e29b-41d4-a716-446655440000")
            @RequestParam("session_id") String sessionId,

            @Parameter(description = "아이 ID", example = "1")
            @RequestParam("child_id") Long childId,

            @Parameter(description = "동화 ID", example = "10")
            @RequestParam("story_id") Long storyId,

            @Parameter(description = "현재 대화 stage (S1~S5)", example = "S1")
            @RequestParam("stage") Stage stage,

            @Parameter(description = "아이의 음성 파일 (.webm 권장)")
            @RequestPart("audio") MultipartFile audio
    ) {
        ConversationTurnResponse response =
                conversationTurnService.processTurn(childId, storyId, stage, sessionId, audio);


        return ApiResponse.success(response);
    }
}
