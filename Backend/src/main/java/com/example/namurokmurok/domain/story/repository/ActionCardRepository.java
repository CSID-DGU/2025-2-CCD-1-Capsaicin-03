package com.example.namurokmurok.domain.story.repository;

import com.example.namurokmurok.domain.story.entity.ActionCard;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ActionCardRepository extends JpaRepository<ActionCard, Long> {
    Optional<ActionCard> findByStoryId(Long storyId);
}
