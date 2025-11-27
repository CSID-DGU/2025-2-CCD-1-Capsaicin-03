package com.example.namurokmurok.domain.conversation.repository;

import com.example.namurokmurok.domain.conversation.entity.Conversation;
import com.example.namurokmurok.domain.conversation.enums.ConversationStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface ConversationRepository extends JpaRepository<Conversation, String> {
    // 해당 child의 모든 conversation 리스트 조회
    List<Conversation> findAllByChildIdOrderByCreatedAtDesc(Long childId);

    Optional<Conversation> findById(String id);

    // 세션 상태가 IN_PROGRESS 이고, 만료 시간(expireAt)이 지난 세션 조회
    List<Conversation> findByStatusInAndExpireAtBefore(
            List<ConversationStatus> statuses,
            LocalDateTime time
    );
}
