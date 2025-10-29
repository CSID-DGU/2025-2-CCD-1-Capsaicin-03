package com.example.namurokmurok.domain.story.entity;


import com.example.namurokmurok.domain.story.enums.SelCategory;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Entity
@NoArgsConstructor
@AllArgsConstructor
@Getter
@Builder
@Table(name = "stories")
public class Story {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "title" ,nullable = false)
    private String title;

    @Column(name = "thumbnail_img_url" ,nullable = false)
    private String thumbnailImgUrl;

    @Column(name = "thumbnail_audio_url" ,nullable = false)
    private String thumbnailAudioUrl;

    @Column(name = "category" ,nullable = false)
    @Enumerated(EnumType.STRING)
    private SelCategory category;

    @OneToMany(mappedBy = "story")
    @OrderBy("pageNumber ASC")
    private List<StoryPage> pages = new ArrayList<>();
}
