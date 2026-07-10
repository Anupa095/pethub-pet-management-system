package com.anupa1.PETHUB.repository;

import com.anupa1.PETHUB.model.ChatMessage;
import com.anupa1.PETHUB.model.ChatSession;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {

    List<ChatMessage> findBySessionOrderByCreatedAtAsc(ChatSession session);

    long countBySession(ChatSession session);

    ChatMessage findTopBySessionOrderByCreatedAtDesc(ChatSession session);
}