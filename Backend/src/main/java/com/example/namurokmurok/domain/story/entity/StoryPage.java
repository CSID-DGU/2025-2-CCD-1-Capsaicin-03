package com.example.namurokmurok.domain.story.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@NoArgsConstructor
@AllArgsConstructor
@Getter
@Builder
@Table(name = "story_pages")
public class StoryPage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "page_number" ,nullable = false)
    private int pageNumber;

    @Column(name = "text_content" ,nullable = false)
    private String textContent;

    @Column(name = "audio_url" ,nullable = false)
    private String audioUrl;

    @Column(name = "img_url" ,nullable = false)
    private String imgUrl;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "story_id", nullable = false)
    private Story story;
}
