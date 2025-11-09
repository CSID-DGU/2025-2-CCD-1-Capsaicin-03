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

    @Column(name = "category" ,nullable = false)
    @Enumerated(EnumType.STRING)
    private SelCategory category;

    @Column(name = "learning_goal", columnDefinition = "TEXT", nullable = false)
    private String learningGoal;

    @OneToMany(mappedBy = "story")
    @OrderBy("pageNumber ASC")
    private List<StoryPage> pages = new ArrayList<>();

    @OneToMany(mappedBy = "story")
    private List<IntroQuestion> introQuestions = new ArrayList<>();

    @OneToMany(mappedBy = "story")
    private List<ActionCard> actionCards = new ArrayList<>();
}