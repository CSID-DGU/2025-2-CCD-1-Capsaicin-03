package com.example.namurokmurok.domain.story.repository;

import com.example.namurokmurok.domain.story.entity.StoryPage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface StoryPageRepository extends JpaRepository<StoryPage, Long> {
    Optional<StoryPage> findByStoryIdAndIsDialogueSceneTrue(Long storyId);
}
