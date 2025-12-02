package com.example.namurokmurok.domain.conversation.service;

import com.example.namurokmurok.domain.conversation.entity.Conversation;
import com.example.namurokmurok.domain.conversation.enums.ConversationStatus;
import com.example.namurokmurok.domain.conversation.repository.ConversationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;

@Log4j2
@Component
@RequiredArgsConstructor
public class ConversationExpireScheduler {

    private final ConversationRepository conversationRepository;

    @Scheduled(fixedRate = 300000) // 5분마다
    public void expireSessions() {
        // 세션 상태가 STARTED 또는 IN_PROGRESS 이고, 만료 시간(expireAt)이 지난 세션 조회
        List<Conversation> expiredSessions =
                conversationRepository.findByStatusInAndExpireAtBefore(
                        List.of(
                                ConversationStatus.STARTED,
                                ConversationStatus.IN_PROGRESS
                        ),
                        LocalDateTime.now()
                );

        expiredSessions.forEach(conv -> {
            conv.updateStatus(ConversationStatus.FAILED);
            conv.updateEndedAt(LocalDateTime.now());
        });

        conversationRepository.saveAll(expiredSessions);

        log.info("💡만료된 대화 세션 {}개를 FAILED 처리함", expiredSessions.size());
    }
}
