package com.example.namurokmurok.domain.story.repository;

import com.example.namurokmurok.domain.story.entity.ChildStoryPage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;


public interface ChildStoryPageRepository extends JpaRepository<ChildStoryPage, Long> {
    Optional<ChildStoryPage> findByChildIdAndStoryId(Long childId, Long storyId);
}
