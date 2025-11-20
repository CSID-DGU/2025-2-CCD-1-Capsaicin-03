package com.example.namurokmurok.domain.story.service;

import com.example.namurokmurok.domain.story.dto.*;
import com.example.namurokmurok.domain.story.entity.ActionCard;
import com.example.namurokmurok.domain.story.entity.IntroQuestion;
import com.example.namurokmurok.domain.story.entity.Story;
import com.example.namurokmurok.domain.story.entity.StoryPage;
import com.example.namurokmurok.domain.story.enums.SelCategory;
import com.example.namurokmurok.domain.story.repository.ActionCardRepository;
import com.example.namurokmurok.domain.story.repository.IntroQuestionRepository;
import com.example.namurokmurok.domain.story.repository.StoryPageRepository;
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
    private final StoryPageRepository storyPageRepository;
    private final IntroQuestionRepository introQuestionRepository;
    private final ActionCardRepository actionCardRepository;

    // 카테고리별 동화 목록 조회
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
                        .build())
                .collect(Collectors.toList());

        return StoryListResponseDto.builder()
                .category(new CategoryInfoResponseDto(category.getCode(), category.getName()))
                .stories(storyList)
                .build();
    }

    // 동화 상세 조회
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

    // 동화별 대화 장면 조회
    public DialogueSceneResponseDto getDialogueScene(Long storyId) {
        Story story = storyRepository.findById(storyId)
                .orElseThrow(() -> new CustomException(ErrorCode.STORY_NOT_FOUND));

        StoryPage  dialogueScene = storyPageRepository.findByStoryIdAndIsDialogueSceneTrue(storyId)
                .orElseThrow(() -> new CustomException(ErrorCode.DIALOGUE_PAGE_NOT_FOUND));

        return DialogueSceneResponseDto.builder()
                .id(dialogueScene.getId())
                .story_id(storyId)
                .page_number(dialogueScene.getPageNumber())
                .learning_goal(story.getLearningGoal())
                .text_content(dialogueScene.getTextContent())
                .img_url(dialogueScene.getImgUrl())
                .audio_url(dialogueScene.getAudioUrl())
                .build();
    }

    // 동화별 인트로 질문 조회
    public IntroQuestionResponseDto getIntroQuestion(Long storyId) {
        storyRepository.findById(storyId)
                .orElseThrow(() -> new CustomException(ErrorCode.STORY_NOT_FOUND));

        IntroQuestion introQuestion = introQuestionRepository.findByStoryId(storyId)
                .orElseThrow(() -> new CustomException(ErrorCode.INTRO_QUESTION_NOT_FOUND));

        return IntroQuestionResponseDto.builder()
                .id(introQuestion.getId())
                .story_id(storyId)
                .text_content(introQuestion.getTextContent())
                .img_url(introQuestion.getImgUrl())
                .audio_url(introQuestion.getAudioUrl())
                .build();
        }

    // 행동 카드 조회
    public ActionCardResponseDto getActionCard(Long storyId) {
        storyRepository.findById(storyId)
                .orElseThrow(() -> new CustomException(ErrorCode.STORY_NOT_FOUND));

        ActionCard actionCard = actionCardRepository.findByStoryId(storyId)
                .orElseThrow(() -> new CustomException(ErrorCode.ACTION_CARD_NOT_FOUND));

        return ActionCardResponseDto.builder()
                .id(actionCard.getId())
                .story_id(storyId)
                .title(actionCard.getTitle())
                .content(actionCard.getContent())
                .img_url(actionCard.getImgUrl())
                .build();
    }
}
