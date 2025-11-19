package com.example.namurokmurok.domain.conversation.entity;

import com.example.namurokmurok.domain.conversation.enums.ConverstationStatus;
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
@Table(name = "conversations")
public class Conversation {

    @Id
    private String id; //세션 id

    @Column(name = "status" ,nullable = false)
    @Enumerated(EnumType.STRING)
    private ConverstationStatus status;

    @Column(name = "started_at" ,nullable = false)
    private LocalDateTime startedAt;

    @Column(name = "ended_at" ,nullable = true)
    private LocalDateTime endedAt;

    @Column(name = "created_at" ,nullable = false)
    private LocalDateTime createdAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "child_id", nullable = false)
    private Child child;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "story_id", nullable = false)
    private Story story;

    @OneToMany(mappedBy = "conversation")
    private List<Dialogue> dialogues = new ArrayList<>();

    public void linkChild(Child child) {
        this.child = child;
    }

    public void linkStory(Story story) {
        this.story = story;
    }
}
