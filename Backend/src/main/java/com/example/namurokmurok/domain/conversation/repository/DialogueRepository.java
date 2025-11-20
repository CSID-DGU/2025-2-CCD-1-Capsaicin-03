package com.example.namurokmurok.domain.conversation.repository;

import com.example.namurokmurok.domain.conversation.entity.Dialogue;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface DialogueRepository extends JpaRepository<Dialogue, Long> {
    @Query("SELECT MAX(d.turnNumber) FROM Dialogue d WHERE d.conversation.id = :conversationId")
    Integer findMaxTurnNumberByConversationId(@Param("conversationId") String conversationId);

}
