package com.example.namurokmurok.domain.story.repository;

import com.example.namurokmurok.domain.story.entity.Story;
import com.example.namurokmurok.domain.story.enums.SelCategory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface StoryRepository extends JpaRepository<Story, Long> {
    List<Story> findAllByCategory(SelCategory category);
}