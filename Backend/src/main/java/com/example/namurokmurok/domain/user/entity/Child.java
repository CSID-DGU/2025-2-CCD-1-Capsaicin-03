package com.example.namurokmurok.domain.user.entity;

import com.example.namurokmurok.domain.conversation.entity.Conversation;
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
@Table(name = "children")
public class Child {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "name" ,nullable = false)
    private String name;

    @Column(name = "birth_year", columnDefinition = "YEAR", nullable = false)
    private Integer birthYear;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @OneToMany(mappedBy = "child")
    private List<Conversation> conversations = new ArrayList<>();

    public void linkUser(User user) {
        this.user = user;
    }

    // 아이 정보 수정
    public void update(String name, Integer birthYear) {
        if (name != null) {
            this.name = name;
        }
        if (birthYear != null) {
            this.birthYear = birthYear;
        }
    }
}
