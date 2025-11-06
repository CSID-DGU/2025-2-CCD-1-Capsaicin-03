package com.example.namurokmurok.domain.story.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.ColumnDefault;

@Entity
@NoArgsConstructor
@AllArgsConstructor
@Getter
@Builder
@Table(name = "story_pages")
public class StoryPage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private long id;

    @Column(name = "page_number" ,nullable = false)
    private int pageNumber;

    @Column(name = "text_content" ,nullable = true) //표지는 text 미제공
    private String textContent;

    @Column(name = "audio_url" ,nullable = false)
    private String audioUrl;

    @Column(name = "img_url" ,nullable = false)
    private String imgUrl;

    @Column(name = "is_dialogue_scene", nullable = false)
    @ColumnDefault("false")
    private boolean isDialogueScene = false;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "story_id", nullable = false)
    private Story story;
}
