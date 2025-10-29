package com.example.namurokmurok.domain.story.service;

import com.example.namurokmurok.domain.story.dto.CategoryInfoResponseDto;
import com.example.namurokmurok.domain.story.dto.StoryListResponseDto;
import com.example.namurokmurok.domain.story.dto.StorySummaryResponseDto;
import com.example.namurokmurok.domain.story.entity.Story;
import com.example.namurokmurok.domain.story.enums.SelCategory;
import com.example.namurokmurok.domain.story.repository.StoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class StoryService {
    private final StoryRepository storyRepository;

    public StoryListResponseDto getStoriesByCategory(SelCategory category) {
        List<Story> stories = storyRepository.findAllByCategory(category);

        List<StorySummaryResponseDto> storyList = stories.stream()
                .map(story -> StorySummaryResponseDto.builder()
                        .id(story.getId())
                        .title(story.getTitle())
                        .thumbnailImgUrl(story.getThumbnailImgUrl())
                        .thumbnailAudioUrl(story.getThumbnailAudioUrl())
                        .build())
                .collect(Collectors.toList());

        return StoryListResponseDto.builder()
                .category(new CategoryInfoResponseDto(category.getCode(), category.getName()))
                .stories(storyList)
                .build();
    }
}
