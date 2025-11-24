package com.example.namurokmurok.domain.conversation.repository;

import com.example.namurokmurok.domain.conversation.entity.Conversation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ConversationRepository extends JpaRepository<Conversation, String> {
    List<Conversation> findAllByChildIdOrderByCreatedAtDesc(Long childId);

    Optional<Conversation> findById(String id);
}
