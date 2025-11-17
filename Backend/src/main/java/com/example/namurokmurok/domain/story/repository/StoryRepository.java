package com.example.namurokmurok.domain.story.repository;

import com.example.namurokmurok.domain.story.entity.Story;
import com.example.namurokmurok.domain.story.enums.SelCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;


import java.util.List;
import java.util.Optional;

public interface StoryRepository extends JpaRepository<Story, Long> {
    List<Story> findAllByCategory(SelCategory category);

    @Query("SELECT DISTINCT s FROM Story s LEFT JOIN FETCH s.pages WHERE s.id = :id")
    Optional<Story> findByIdWithPages(@Param("id") Long id);

    Optional<Story> findByTitle(String title);
}