package com.example.namurokmurok.domain.conversation.repository;

import com.example.namurokmurok.domain.conversation.entity.Conversation;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ConverstationRepository extends JpaRepository<Conversation, String> {
}
