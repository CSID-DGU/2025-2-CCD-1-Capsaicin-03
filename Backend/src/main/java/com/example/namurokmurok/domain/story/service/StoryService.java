package com.example.namurokmurok.domain.story.service;

import com.example.namurokmurok.domain.conversation.dto.SessionStartResponse;
import com.example.namurokmurok.domain.conversation.service.ConversationService;
import com.example.namurokmurok.domain.story.dto.*;
import com.example.namurokmurok.domain.story.entity.*;
import com.example.namurokmurok.domain.story.enums.SelCategory;
import com.example.namurokmurok.domain.story.repository.*;
import com.example.namurokmurok.domain.user.entity.Child;
import com.example.namurokmurok.domain.user.repository.ChildRepository;
import com.example.namurokmurok.global.common.exception.CustomException;
import com.example.namurokmurok.global.common.exception.ErrorCode;
import com.example.namurokmurok.global.security.CustomUserDetails;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
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
    private final ChildRepository childRepository;
    private final ChildStoryPageRepository childStoryPageRepository;
    private final ConversationService conversationService;

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
    @Transactional(readOnly = true)
    public StoryInfoResponseDto getStoryDetail(Long storyId, Boolean continueFlag) {

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

        Integer lastReadPage = null;

        if (continueFlag != null && continueFlag) {

            // 로그인 사용자 가져오기
            Long loginUserId = getLoginUserId();

            // 로그인 사용자의 아이 조회
            Child child = childRepository.findByUserId(loginUserId)
                    .orElseThrow(() -> new CustomException(ErrorCode.CHILD_NOT_FOUND));

            // 마지막 읽은 페이지 조회
            lastReadPage = childStoryPageRepository
                    .findByChildIdAndStoryId(child.getId(), storyId)
                    .map(c -> c.getStoryPage().getPageNumber())
                    .orElse(null);
        }

        return StoryInfoResponseDto.builder()
                .id(story.getId())
                .title(story.getTitle())
                .totalPages(pageDtos.size())
                .lastReadPage(lastReadPage)
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
    public IntroQuestionResponseDto getIntroQuestion(Long storyId, Long userId) {
        storyRepository.findById(storyId)
                .orElseThrow(() -> new CustomException(ErrorCode.STORY_NOT_FOUND));

        IntroQuestion introQuestion = introQuestionRepository.findByStoryId(storyId)
                .orElseThrow(() -> new CustomException(ErrorCode.INTRO_QUESTION_NOT_FOUND));

        Child child = childRepository.findByUserId(userId)
                .orElseThrow(() -> new CustomException(ErrorCode.CHILD_NOT_FOUND));

        // 세션 id 발급 요청
        SessionStartResponse sessionRes = conversationService.startSession(storyId, child.getId());

        return IntroQuestionResponseDto.builder()
                .id(introQuestion.getId())
                .story_id(storyId)
                .text_content(sessionRes.getAi_intro()) //인트로 텍스트
                .img_url(introQuestion.getImgUrl())
                .audio_url(sessionRes.getAi_intro_audio_base64()) // 인트로 오디오
                .session_id(sessionRes.getSession_id())
                .build();
        }

    // 행동 카드 조회
    public ActionCardResponseDto getActionCard(Long storyId) {
        storyRepository.findById(storyId)
                .orElseThrow(() -> new CustomException(ErrorCode.STORY_NOT_FOUND));

        List<ActionCard> actionCards = actionCardRepository.findAllByStoryId(storyId);

        if (actionCards.isEmpty()) {
            throw new CustomException(ErrorCode.ACTION_CARD_NOT_FOUND);
        }

        int randomIndex = (int) (Math.random() * actionCards.size());
        ActionCard selected = actionCards.get(randomIndex);

        return ActionCardResponseDto.builder()
                .id(selected.getId())
                .story_id(storyId)
                .title(selected.getTitle())
                .actionContent(selected.getActionContent())
                .situationContent(selected.getSituationContent())
                .img_url(selected.getImgUrl())
                .build();
    }

    // 로그인한 사용자 ID 가져오기
    private Long getLoginUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null || !(authentication.getPrincipal() instanceof CustomUserDetails)) {
            throw new CustomException(ErrorCode.TOKEN_NOT_PROVIDED);
        }

        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
        return userDetails.getUserId();
    }


    // 로그인한 사용자 아이 검증 메서드
    private Child validateUserAndGetChild(Long childId) {

        // 로그인 사용자 가져오기
        Long loginUserId = getLoginUserId();

        // 아이 조회
        Child child = childRepository.findById(childId)
                .orElseThrow(() -> new CustomException(ErrorCode.CHILD_NOT_FOUND));

        // 아이 소유자 검증
        if (!child.getUser().getId().equals(loginUserId)) {
            throw new CustomException(ErrorCode.CHILD_ACCESS_DENIED);
        }

        return child;
    }

    // 아이별 동화 페이지 저장
    @Transactional
    public void saveOrUpdatePage(Long storyId, Long childId, ChildStoryPageUpdateRequestDto request) {

        Child child = validateUserAndGetChild(childId);

        Story story = storyRepository.findById(storyId)
                .orElseThrow(() -> new CustomException(ErrorCode.STORY_NOT_FOUND));

        // 스토리 마지막 페이지 번호 조회
        int lastPageNumber = storyPageRepository.findLastPageNumberByStoryId(storyId)
                .orElseThrow(() -> new CustomException(ErrorCode.STORY_PAGE_NOT_FOUND));

        // 요청된 page_number가 있다면 해당 storyPage 조회
        StoryPage newPage = null;
        if (request.getPageNumber() != null) {
            newPage = storyPageRepository
                    .findByStoryIdAndPageNumber(storyId, request.getPageNumber())
                    .orElseThrow(() -> new CustomException(ErrorCode.STORY_PAGE_NOT_FOUND));
        }

        // 기존 기록 조회
        ChildStoryPage progress = childStoryPageRepository
                .findByChildIdAndStoryId(childId, storyId)
                .orElse(null);

        // CREATE 로직 (최초 요청)
        if (progress == null) {

            Boolean isEnd = request.getEnd();
            // 신규 생성이고, is_end=true인데 page_number 없을 경우 에러
            if (isEnd != null && isEnd && newPage == null) {
                throw new CustomException(ErrorCode.PAGE_NUMBER_REQUIRED_FOR_END);
            }

            // 신규 생성인데 page_number 없을 경우 에러
            if (newPage == null) {
                throw new CustomException(ErrorCode.INVALID_REQUEST);
            }

            // 완독 요청이면 반드시 마지막 페이지여야 함
            if (isEnd != null && isEnd && newPage.getPageNumber() != lastPageNumber) {
                throw new CustomException(ErrorCode.INVALID_END_REQUEST);
            }

            progress = ChildStoryPage.builder()
                    .child(child)
                    .story(story)
                    .storyPage(newPage)
                    .isEnd(isEnd != null && isEnd)
                    .updatedAt(LocalDateTime.now())
                    .build();

            childStoryPageRepository.save(progress);
            return;
        }

        // PATCH 로직 (기존 데이터 수정)
        // page_number 전달 시 페이지 업데이트
        if (newPage != null) {
            progress.updateStoryPage(newPage);
        }

        if (request.getEnd() != null) {

            Boolean isEnd = request.getEnd();

            if (isEnd) {

                // 완독 요청인데 page_number가 없는 경우
                if (request.getPageNumber() == null) {
                    throw new CustomException(ErrorCode.PAGE_NUMBER_REQUIRED_FOR_END);
                }

                // page_number가 존재하지만 마지막 페이지가 아닌 경우
                if (newPage.getPageNumber() != lastPageNumber) {
                    throw new CustomException(ErrorCode.INVALID_END_REQUEST);
                }
            }
            progress.setIsEnd(isEnd);
        }

        progress.setUpdatedAt(LocalDateTime.now());
    }

    // 아이별 동화 페이지 조회
    @Transactional(readOnly = true)
    public ChildStoryPageResponseDto getLastReadPage(Long storyId, Long childId) {

        Child child = validateUserAndGetChild(childId);

        ChildStoryPage progress = childStoryPageRepository
                .findByChildIdAndStoryId(childId, storyId)
                .orElseThrow(() -> new CustomException(ErrorCode.CHILD_STORY_PROGRESS_NOT_FOUND));

        return ChildStoryPageResponseDto.builder()
                .childId(childId)
                .storyId(storyId)
                .pageNumber(progress.getStoryPage().getPageNumber())
                .end(progress.isEnd())
                .build();
    }
}
