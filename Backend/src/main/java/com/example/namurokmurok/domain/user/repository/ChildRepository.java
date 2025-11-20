package com.example.namurokmurok.domain.user.repository;

import com.example.namurokmurok.domain.user.entity.Child;
import com.example.namurokmurok.domain.user.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;


public interface ChildRepository extends JpaRepository<Child, Long> {
    boolean existsByUser(User user);
}
