package com.example.namurokmurok.domain.story.repository;

import com.example.namurokmurok.domain.story.entity.ActionCard;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ActionCardRepository extends JpaRepository<ActionCard, Long> {
    List<ActionCard> findAllByStoryId(Long storyId);
}
