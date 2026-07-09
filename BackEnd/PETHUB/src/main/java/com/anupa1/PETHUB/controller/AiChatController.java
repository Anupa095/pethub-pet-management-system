package com.anupa1.PETHUB.controller;

import com.anupa1.PETHUB.dto.AiChatRequest;
import com.anupa1.PETHUB.dto.AiChatResponse;
import com.anupa1.PETHUB.dto.ChatMessageDTO;
import com.anupa1.PETHUB.dto.ChatSessionSummaryDTO;
import com.anupa1.PETHUB.service.ChatAgentService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/ai-chat")
@CrossOrigin
public class AiChatController {

    private final ChatAgentService chatAgentService;

    public AiChatController(ChatAgentService chatAgentService) {
        this.chatAgentService = chatAgentService;
    }

    @PostMapping("/chat")
    public ResponseEntity<?> sendMessage(@RequestBody AiChatRequest request) {
        try {
            AiChatResponse response = chatAgentService.handleChat(request);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", ex.getMessage()
            ));
        } catch (Exception ex) {
            ex.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "success", false,
                    "message", "Failed to generate AI response"
            ));
        }
    }

    @GetMapping("/sessions")
    public ResponseEntity<?> getSessions(@RequestParam String userEmail) {
        try {
            List<ChatSessionSummaryDTO> sessions = chatAgentService.getSessions(userEmail);
            return ResponseEntity.ok(sessions);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", ex.getMessage()
            ));
        }
    }

    @GetMapping("/sessions/{sessionId}/messages")
    public ResponseEntity<?> getMessages(@PathVariable Long sessionId, @RequestParam String userEmail) {
        try {
            List<ChatMessageDTO> messages = chatAgentService.getSessionMessages(sessionId, userEmail);
            return ResponseEntity.ok(messages);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", ex.getMessage()
            ));
        }
    }
}