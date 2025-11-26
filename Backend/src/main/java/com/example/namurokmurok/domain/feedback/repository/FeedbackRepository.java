package com.example.namurokmurok.domain.feedback.repository;

import com.example.namurokmurok.domain.feedback.entity.Feedback;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FeedbackRepository extends JpaRepository<Feedback, Long> {
}
