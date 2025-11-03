package com.example.namurokmurok.domain.story.service;

import com.example.namurokmurok.domain.story.dto.*;
import com.example.namurokmurok.domain.story.entity.Story;
import com.example.namurokmurok.domain.story.entity.StoryPage;
import com.example.namurokmurok.domain.story.enums.SelCategory;
import com.example.namurokmurok.domain.story.repository.StoryRepository;
import com.example.namurokmurok.global.exception.CustomException;
import com.example.namurokmurok.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class StoryService {
    private final StoryRepository storyRepository;

    public StoryListResponseDto getStoriesByCategory(SelCategory category) {
        List<Story> stories = storyRepository.findAllByCategory(category);

        try {
            category = SelCategory.valueOf(category.getCode().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new CustomException(ErrorCode.INVALID_CATEGORY);
        }

        List<StorySummaryResponseDto> storyList = stories.stream()
                .map(story -> StorySummaryResponseDto.builder()
                        .id(story.getId())
                        .title(story.getTitle())
                        .thumbnail_img_url(story.getThumbnailImgUrl())
                        .thumbnail_audio_url(story.getThumbnailAudioUrl())
                        .build())
                .collect(Collectors.toList());

        return StoryListResponseDto.builder()
                .category(new CategoryInfoResponseDto(category.getCode(), category.getName()))
                .stories(storyList)
                .build();
    }

    public StoryInfoResponseDto getStoryDetail(Long storyId) {
        Story story = storyRepository.findByIdWithPages(storyId)
                .orElseThrow(() -> new CustomException(ErrorCode.STORY_NOT_FOUND));

        List<PageInfoResponseDto> pageDtos = story.getPages().stream()
                .sorted(Comparator.comparingInt(StoryPage::getPageNumber))
                .map(p -> PageInfoResponseDto.builder()
                        .page_number(p.getPageNumber())
                        .text_content(p.getTextContent())
                        .image_url(p.getImgUrl())
                        .audio_url(p.getAudioUrl())
                        .build())
                .collect(Collectors.toList());

        return StoryInfoResponseDto.builder()
                .id(story.getId())
                .title(story.getTitle())
                .total_pages(pageDtos.size())
                .pages(pageDtos)
                .build();
    }
}
