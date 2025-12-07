package com.example.namurokmurok.domain.story.entity;

import com.example.namurokmurok.domain.user.entity.Child;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@NoArgsConstructor
@AllArgsConstructor
@Getter
@Builder
@Table(name = "child_story_pages")
public class ChildStoryPage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "is_end", nullable = false)
    @Builder.Default
    private boolean isEnd = false;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "child_id", nullable = false)
    private Child child;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "story_id", nullable = false)
    private Story story;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "story_page_id", nullable = false)
    private StoryPage storyPage;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public void updateStoryPage(StoryPage newPage) {
        this.storyPage = newPage;
        this.updatedAt = LocalDateTime.now();
    }

    public void setIsEnd(boolean isEnd) {
        this.isEnd = isEnd;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

}
