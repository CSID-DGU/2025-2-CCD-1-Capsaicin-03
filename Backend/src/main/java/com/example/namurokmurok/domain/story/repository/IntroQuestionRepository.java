package com.example.namurokmurok.domain.story.repository;

import com.example.namurokmurok.domain.story.entity.IntroQuestion;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface IntroQuestionRepository extends JpaRepository<IntroQuestion, Long> {
    Optional<IntroQuestion> findByStoryId(Long storyId);
}
