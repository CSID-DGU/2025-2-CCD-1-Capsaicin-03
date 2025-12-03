package com.example.namurokmurok.domain.feedback.repository;

import com.example.namurokmurok.domain.feedback.entity.Feedback;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface FeedbackRepository extends JpaRepository<Feedback, Long> {
    Optional<Feedback> findByConversationId(String conversationId);
    boolean existsByConversationId(String conversationId);
}
