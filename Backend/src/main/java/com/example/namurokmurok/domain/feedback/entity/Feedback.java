package com.example.namurokmurok.domain.feedback.entity;

import com.example.namurokmurok.domain.conversation.entity.Conversation;
import com.example.namurokmurok.global.common.enums.GenerationStatus;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@NoArgsConstructor
@AllArgsConstructor
@Getter
@Builder
@Table(name = "feedback")
public class Feedback {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "feedback_content", columnDefinition = "TEXT", nullable = true)
    private String feedbackContent;

    @Column(name = "action_guide", columnDefinition = "TEXT", nullable = true)
    private String actionGuide;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private GenerationStatus generationStatus;

    @Column(name = "generated_at", nullable = false)
    private LocalDateTime generatedAt;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "conversation_id")
    private Conversation conversation;

    public void updateContent(String content, String actionGuide, LocalDateTime generatedAt, GenerationStatus status) {
        this.feedbackContent = content;
        this.actionGuide = actionGuide;
        this.generatedAt = generatedAt;
        this.generationStatus = status;
    }

    public void updateStatus(GenerationStatus status) {
        this.generationStatus = status;
    }
}
