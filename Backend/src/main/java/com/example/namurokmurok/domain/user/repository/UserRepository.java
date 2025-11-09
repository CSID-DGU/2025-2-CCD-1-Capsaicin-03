package com.example.namurokmurok.domain.user.repository;

import com.example.namurokmurok.domain.user.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findBySupabaseId(String supabaseId);
}
