package com.example.namurokmurok.domain.story.repository;

import com.example.namurokmurok.domain.story.entity.StoryPage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;

public interface StoryPageRepository extends JpaRepository<StoryPage, Long> {
    Optional<StoryPage> findByStoryIdAndIsDialogueSceneTrue(Long storyId);

    Optional<StoryPage> findByStoryIdAndPageNumber(Long storyId, Integer pageNumber);

    // 동화의 마지막 페이지 조회
    @Query("SELECT MAX(sp.pageNumber) FROM StoryPage sp WHERE sp.story.id = :storyId")
    Optional<Integer> findLastPageNumberByStoryId(Long storyId);
}
