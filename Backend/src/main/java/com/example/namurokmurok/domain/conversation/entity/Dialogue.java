package com.example.namurokmurok.domain.conversation.entity;

import com.example.namurokmurok.domain.conversation.enums.Speaker;
import com.example.namurokmurok.domain.conversation.enums.Stage;
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
@Table(name = "dialogues")
public class Dialogue {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "conversation_id")
    private Conversation conversation;

    @Column(name = "turn_number")
    private int turnNumber;

    @Enumerated(EnumType.STRING)
    @Column(name = "stage")
    private Stage stage;

    @Column(name = "retry_count", nullable = false)
    private int retryCount;

    @Column(name = "speaker", nullable = false)
    private Speaker speaker;

    @Column(name = "content", columnDefinition = "TEXT", nullable = false)
    private String content;

    @Column(name = "audio_url", nullable = true) //TTS 업로드 url
    private String audioUrl;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "is_safty", nullable = true)
    private boolean isSafty;

    @Column(name = "unsafe_reason", columnDefinition = "TEXT" ,nullable = true)
    private String unsafeReason;

    @Column(name = "fallback_triggered", nullable = false)
    private boolean fallbackTriggered;
}
