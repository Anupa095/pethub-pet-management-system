package com.anupa1.PETHUB.repository;

import com.anupa1.PETHUB.model.ChatSession;
import com.anupa1.PETHUB.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ChatSessionRepository extends JpaRepository<ChatSession, Long> {

    List<ChatSession> findByUserOrderByUpdatedAtDesc(User user);

    Optional<ChatSession> findByIdAndUser(Long id, User user);
}