package com.example.namurokmurok.domain.conversation.entity;

import com.example.namurokmurok.domain.conversation.enums.ConversationStatus;
import com.example.namurokmurok.domain.feedback.entity.Feedback;
import com.example.namurokmurok.domain.story.entity.Story;
import com.example.namurokmurok.domain.user.entity.Child;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@NoArgsConstructor
@AllArgsConstructor
@Getter
@Builder
@Table(
        name = "conversations",
        indexes = {
                @Index(name = "idx_conversation_status", columnList = "status"),
                @Index(name = "idx_conversation_expire_at", columnList = "expire_at")
        }
)
public class Conversation {

    @Id
    private String id; //세션 id

    @Column(name = "status" ,nullable = false)
    @Enumerated(EnumType.STRING)
    private ConversationStatus status;

    @Column(name = "started_at" ,nullable = false)
    private LocalDateTime startedAt;

    @Column(name = "ended_at" ,nullable = true)
    private LocalDateTime endedAt;

    @Column(name = "created_at" ,nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "expire_at" ,nullable = false)
    private LocalDateTime expireAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "child_id", nullable = false)
    private Child child;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "story_id", nullable = false)
    private Story story;

    @OneToMany(mappedBy = "conversation")
    private List<Dialogue> dialogues = new ArrayList<>();

    @OneToOne(mappedBy = "conversation", fetch = FetchType.LAZY)
    private Feedback feedback;

    public void updateStatus(ConversationStatus status) {
        this.status = status;
    }

    public void updateEndedAt(LocalDateTime endedAt) {
        this.endedAt = endedAt;
    }
}
