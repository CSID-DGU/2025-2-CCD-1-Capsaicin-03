package com.example.namurokmurok.domain.conversation.repository;

import com.example.namurokmurok.domain.conversation.entity.Dialogue;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DialogueRepository extends JpaRepository<Dialogue, Long> {
}
