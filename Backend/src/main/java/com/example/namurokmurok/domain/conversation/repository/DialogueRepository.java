package com.example.namurokmurok.domain.conversation.repository;

import com.example.namurokmurok.domain.conversation.entity.Dialogue;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface DialogueRepository extends JpaRepository<Dialogue, Long> {
    @Query("SELECT MAX(d.turnNumber) FROM Dialogue d WHERE d.conversation.id = :conversationId")
    Integer findMaxTurnNumberByConversationId(@Param("conversationId") String conversationId);

    // turn_number ASC 정렬하여 대화 로그 조회
    List<Dialogue> findAllByConversationIdOrderByTurnNumberAsc(String conversationId);

}
