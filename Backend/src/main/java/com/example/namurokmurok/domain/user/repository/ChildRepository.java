package com.example.namurokmurok.domain.user.repository;

import com.example.namurokmurok.domain.user.entity.Child;
import com.example.namurokmurok.domain.user.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;


public interface ChildRepository extends JpaRepository<Child, Long> {
    boolean existsByUser(User user);

    Optional<Child> findByUserId(Long userId);
}