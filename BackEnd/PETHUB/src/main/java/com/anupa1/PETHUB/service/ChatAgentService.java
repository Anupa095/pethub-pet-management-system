package com.anupa1.PETHUB.service;

import com.anupa1.PETHUB.dto.AiChatRequest;
import com.anupa1.PETHUB.dto.AiChatResponse;
import com.anupa1.PETHUB.dto.ChatMessageDTO;
import com.anupa1.PETHUB.dto.ChatSessionSummaryDTO;
import com.anupa1.PETHUB.model.ChatMessage;
import com.anupa1.PETHUB.model.ChatSession;
import com.anupa1.PETHUB.model.Pet;
import com.anupa1.PETHUB.model.User;
import com.anupa1.PETHUB.repository.ChatMessageRepository;
import com.anupa1.PETHUB.repository.ChatSessionRepository;
import com.anupa1.PETHUB.repository.PetRepository;
import com.anupa1.PETHUB.repository.UserRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class ChatAgentService {

    private final UserRepository userRepository;
    private final PetRepository petRepository;
    private final ChatSessionRepository chatSessionRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final ObjectMapper objectMapper;

    @Value("${OPENROUTER_API_KEY:${OPENAI_API_KEY:${GROQ_API_KEY:}}}")
    private String openRouterApiKey;

    @Value("${OPENAI_BASE_URL:${GROQ_BASE_URL:https://openrouter.ai/api/v1}}")
    private String openRouterBaseUrl;

    @Value("${OPENAI_MODEL:${GROQ_MODEL:tencent/hy3:free}}")
    private String openRouterModel;

    @Value("${OPENROUTER_HTTP_REFERER:https://pethub.local}")
    private String openRouterReferer;

    @Value("${OPENROUTER_TITLE:PetHub}")
    private String openRouterTitle;

    public ChatAgentService(UserRepository userRepository,
                            PetRepository petRepository,
                            ChatSessionRepository chatSessionRepository,
                            ChatMessageRepository chatMessageRepository,
                            ObjectMapper objectMapper) {
        this.userRepository = userRepository;
        this.petRepository = petRepository;
        this.chatSessionRepository = chatSessionRepository;
        this.chatMessageRepository = chatMessageRepository;
        this.objectMapper = objectMapper;
    }

    public AiChatResponse handleChat(AiChatRequest request) {
        String userEmail = normalize(request.getUserEmail());
        String messageText = normalize(request.getMessage());

        if (userEmail.isBlank() || messageText.isBlank()) {
            throw new IllegalArgumentException("User email and message are required");
        }

        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        Pet activePet = resolvePet(request.getPetId(), user);
        ChatSession session = resolveSession(request.getSessionId(), user, activePet, messageText);

        ChatMessage userMessage = new ChatMessage();
        userMessage.setSession(session);
        userMessage.setRole("user");
        userMessage.setContent(messageText);
        userMessage.setCreatedAt(LocalDateTime.now());
        chatMessageRepository.save(userMessage);

        session.setUpdatedAt(LocalDateTime.now());
        chatSessionRepository.save(session);

        ChatContext context = buildContext(messageText, activePet, session);
        String aiResponse = generateResponse(context);

        ChatMessage assistantMessage = new ChatMessage();
        assistantMessage.setSession(session);
        assistantMessage.setRole("assistant");
        assistantMessage.setContent(aiResponse);
        assistantMessage.setCreatedAt(LocalDateTime.now());
        chatMessageRepository.save(assistantMessage);

        session.setUpdatedAt(LocalDateTime.now());
        chatSessionRepository.save(session);

        AiChatResponse response = new AiChatResponse();
        response.setSessionId(session.getId());
        response.setSessionTitle(session.getTitle());
        response.setAiResponse(aiResponse);
        response.setMessages(loadMessages(session));
        return response;
    }

    public List<ChatSessionSummaryDTO> getSessions(String userEmail) {
        User user = userRepository.findByEmail(normalize(userEmail))
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        List<ChatSession> sessions = chatSessionRepository.findByUserOrderByUpdatedAtDesc(user);
        Map<Long, Pet> petCache = new HashMap<>();

        return sessions.stream()
                .map(session -> toSummary(session, petCache))
                .collect(Collectors.toList());
    }

    public List<ChatMessageDTO> getSessionMessages(Long sessionId, String userEmail) {
        User user = userRepository.findByEmail(normalize(userEmail))
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        ChatSession session = chatSessionRepository.findByIdAndUser(sessionId, user)
                .orElseThrow(() -> new IllegalArgumentException("Chat session not found"));

        return loadMessages(session);
    }

    private ChatSession resolveSession(Long sessionId, User user, Pet pet, String messageText) {
        if (sessionId != null) {
            return chatSessionRepository.findByIdAndUser(sessionId, user)
                    .orElseThrow(() -> new IllegalArgumentException("Chat session not found"));
        }

        ChatSession session = new ChatSession();
        session.setUser(user);
        session.setPetId(pet != null ? pet.getId() : null);
        session.setTitle(buildSessionTitle(pet, messageText));
        session.setCreatedAt(LocalDateTime.now());
        session.setUpdatedAt(LocalDateTime.now());
        return chatSessionRepository.save(session);
    }

    private Pet resolvePet(Long petId, User user) {
        if (petId == null) {
            return petRepository.findByUserOrderByIdAsc(user).stream().findFirst().orElse(null);
        }

        Optional<Pet> pet = petRepository.findById(petId);
        if (pet.isEmpty()) {
            return null;
        }

        if (pet.get().getUser() == null || !user.getEmail().equalsIgnoreCase(pet.get().getUser().getEmail())) {
            throw new IllegalArgumentException("Selected pet does not belong to the current user");
        }

        return pet.get();
    }

    private List<ChatMessageDTO> loadMessages(ChatSession session) {
        return chatMessageRepository.findBySessionOrderByCreatedAtAsc(session).stream()
                .map(message -> new ChatMessageDTO(
                        message.getId(),
                        message.getRole(),
                        message.getContent(),
                        message.getCreatedAt()))
                .collect(Collectors.toList());
    }

    private ChatSessionSummaryDTO toSummary(ChatSession session, Map<Long, Pet> petCache) {
        ChatSessionSummaryDTO summary = new ChatSessionSummaryDTO();
        summary.setSessionId(session.getId());
        summary.setTitle(session.getTitle());
        summary.setPetId(session.getPetId());
        summary.setCreatedAt(session.getCreatedAt());
        summary.setUpdatedAt(session.getUpdatedAt());
        summary.setMessageCount(chatMessageRepository.countBySession(session));

        ChatMessage latestMessage = chatMessageRepository.findTopBySessionOrderByCreatedAtDesc(session);
        if (latestMessage != null) {
            summary.setLastMessagePreview(trimPreview(latestMessage.getContent()));
        } else {
            summary.setLastMessagePreview("");
        }

        if (session.getPetId() != null) {
            Pet pet = petCache.computeIfAbsent(session.getPetId(), petId -> petRepository.findById(petId).orElse(null));
            if (pet != null) {
                summary.setPetName(pet.getName());
            }
        }

        return summary;
    }

    private ChatContext buildContext(String messageText, Pet pet, ChatSession session) {
        List<ChatMessageDTO> recentMessages = chatMessageRepository.findBySessionOrderByCreatedAtAsc(session)
                .stream()
                .map(message -> new ChatMessageDTO(message.getId(), message.getRole(), message.getContent(), message.getCreatedAt()))
                .collect(Collectors.toList());

        List<String> symptoms = extractSymptoms(messageText);
        String duration = extractDuration(messageText);
        String severity = calculateSeverity(messageText, symptoms, duration);
        Map<String, Object> petHistory = buildPetHistory(pet);
        Map<String, Object> knowledge = retrieveKnowledge(symptoms);
        String recommendation = buildRecommendation(severity, duration, symptoms);

        return new ChatContext(
                messageText,
                pet,
                recentMessages,
                symptoms,
                duration,
                severity,
                petHistory,
                knowledge,
                recommendation
        );
    }

    private String generateResponse(ChatContext context) {
        String prompt = buildPrompt(context);

        if (openRouterApiKey == null || openRouterApiKey.isBlank()) {
            return buildFallbackResponse(context);
        }

        try {
            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("model", openRouterModel);
            payload.put("messages", List.of(
                    Map.of("role", "system", "content", "You are a professional veterinary assistant for PetHub. Always explain that this is not a confirmed diagnosis. Give concise, practical advice and include urgent warning signs when relevant."),
                    Map.of("role", "user", "content", prompt)
            ));

            String requestBody = objectMapper.writeValueAsString(payload);
            String completionUrl = buildCompletionUrl(openRouterBaseUrl);
            HttpURLConnection connection = (HttpURLConnection) new URL(completionUrl).openConnection();
            connection.setRequestMethod("POST");
            connection.setRequestProperty("Authorization", "Bearer " + openRouterApiKey);
            connection.setRequestProperty("Content-Type", "application/json");
            if (openRouterReferer != null && !openRouterReferer.isBlank()) {
                connection.setRequestProperty("HTTP-Referer", openRouterReferer);
            }
            if (openRouterTitle != null && !openRouterTitle.isBlank()) {
                connection.setRequestProperty("X-Title", openRouterTitle);
            }
            connection.setDoOutput(true);

            try (OutputStream outputStream = connection.getOutputStream()) {
                outputStream.write(requestBody.getBytes(StandardCharsets.UTF_8));
            }

            int status = connection.getResponseCode();
            BufferedReader reader = new BufferedReader(new InputStreamReader(
                    status >= 200 && status < 300 ? connection.getInputStream() : connection.getErrorStream(),
                    StandardCharsets.UTF_8));

            String responseBody = reader.lines().collect(Collectors.joining(System.lineSeparator()));
            reader.close();

            if (status >= 200 && status < 300) {
                JsonNode root = objectMapper.readTree(responseBody);
                JsonNode contentNode = root.path("choices").path(0).path("message").path("content");
                if (!contentNode.isMissingNode() && !contentNode.asText().isBlank()) {
                    return contentNode.asText();
                }
            }
        } catch (Exception ex) {
            ex.printStackTrace();
        }

        return buildFallbackResponse(context);
    }

    private String buildPrompt(ChatContext context) {
        String petDetails = context.pet == null
            ? "No pet profile was linked to this chat."
            : String.format(Locale.ENGLISH,
            "Breed: %s%nAge: %s years%nGender: %s%nVaccination: %s",
            safe(context.pet.getBreed()),
            safeNumber(context.pet.getAge()),
            safe(context.pet.getGender()),
            "unknown");

        String recentHistory = context.recentMessages.stream()
                .skip(Math.max(0, context.recentMessages.size() - 10L))
                .map(message -> message.getRole() + ": " + message.getContent())
                .collect(Collectors.joining("\n"));

        return String.join("\n\n",
                "Pet Details\n" + petDetails,
                "Extracted Symptoms\n" + String.join("\n", context.symptoms.isEmpty() ? List.of("None detected") : context.symptoms),
                "Duration\n" + (context.duration.isBlank() ? "Not specified" : context.duration),
                "Retrieved Knowledge\nPossible Diseases\n" + joinList(asStringList(context.knowledge.get("possibleDiseases")))
                        + "\n\nRecommended Care\n" + joinList(asStringList(context.knowledge.get("recommendedCare")))
                        + "\n\nEmergency Signs\n" + joinList(asStringList(context.knowledge.get("emergencySigns"))),
                "Recommendation\n" + context.recommendation,
                "Recent Chat Memory\n" + (recentHistory.isBlank() ? "No previous conversation." : recentHistory),
                "User Message\n" + context.userMessage,
                "Generate a professional veterinary response. Always explain that this is not a confirmed diagnosis."
        );
    }

    private String buildFallbackResponse(ChatContext context) {
        List<String> possibleDiseases = asStringList(context.knowledge.get("possibleDiseases"));
        List<String> recommendedCare = asStringList(context.knowledge.get("recommendedCare"));
        List<String> emergencySigns = asStringList(context.knowledge.get("emergencySigns"));

        StringBuilder builder = new StringBuilder();
        builder.append("This is not a confirmed diagnosis. Based on the symptoms, the most likely possibilities are ");
        builder.append(possibleDiseases.isEmpty() ? "a gastrointestinal issue or another acute illness." : joinList(possibleDiseases) + ".");
        builder.append("\n\nRecommendations:\n");

        if (recommendedCare.isEmpty()) {
            builder.append("- Keep your pet hydrated.\n- Offer a gentle diet once vomiting settles.\n");
        } else {
            recommendedCare.forEach(item -> builder.append("- ").append(item).append("\n"));
        }

        builder.append("\nMonitor for emergency signs:\n");
        if (emergencySigns.isEmpty()) {
            builder.append("- Collapse\n- Severe weakness\n- Blood in vomit\n");
        } else {
            emergencySigns.forEach(item -> builder.append("- ").append(item).append("\n"));
        }

        builder.append("\nRisk level: ").append(context.severity).append(".");
        builder.append("\nSuggested action: ").append(context.recommendation).append(".");
        return builder.toString();
    }

    private Map<String, Object> buildPetHistory(Pet pet) {
        Map<String, Object> history = new LinkedHashMap<>();
        if (pet == null) {
            history.put("available", false);
            return history;
        }

        history.put("available", true);
        history.put("breed", pet.getBreed());
        history.put("age", pet.getAge());
        history.put("gender", pet.getGender());
        history.put("imageUrl", pet.getImageUrl());
        history.put("previousDiseases", List.of());
        return history;
    }

    private Map<String, Object> retrieveKnowledge(List<String> symptoms) {
        Map<String, Object> knowledge = new LinkedHashMap<>();
        List<String> lowerSymptoms = symptoms.stream().map(String::toLowerCase).toList();

        List<String> possibleDiseases = new ArrayList<>();
        List<String> recommendedCare = new ArrayList<>();
        List<String> emergencySigns = new ArrayList<>();

        if (lowerSymptoms.stream().anyMatch(value -> value.contains("vomit") || value.contains("vomiting") || value.contains("nausea"))) {
            possibleDiseases.add("Gastritis");
            possibleDiseases.add("Food Poisoning");
            recommendedCare.add("Hydration");
            recommendedCare.add("Soft diet");
            emergencySigns.add("Blood in vomit");
            emergencySigns.add("Collapse");
        }

        if (lowerSymptoms.stream().anyMatch(value -> value.contains("diarrhea") || value.contains("loose stool"))) {
            possibleDiseases.add("Gastroenteritis");
            recommendedCare.add("Electrolytes if advised by a vet");
            emergencySigns.add("Dehydration");
        }

        if (lowerSymptoms.stream().anyMatch(value -> value.contains("cough"))) {
            possibleDiseases.add("Respiratory irritation");
            recommendedCare.add("Keep the pet calm and monitor breathing");
            emergencySigns.add("Difficulty breathing");
        }

        if (possibleDiseases.isEmpty()) {
            possibleDiseases.add("General illness requiring veterinary review");
            recommendedCare.add("Observe symptoms closely");
            emergencySigns.add("Rapid worsening");
        }

        knowledge.put("possibleDiseases", possibleDiseases.stream().distinct().collect(Collectors.toList()));
        knowledge.put("recommendedCare", recommendedCare.stream().distinct().collect(Collectors.toList()));
        knowledge.put("emergencySigns", emergencySigns.stream().distinct().collect(Collectors.toList()));
        return knowledge;
    }

    private List<String> extractSymptoms(String messageText) {
        String lower = messageText.toLowerCase(Locale.ENGLISH);
        List<String> symptoms = new ArrayList<>();

        if (lower.contains("vomit")) {
            symptoms.add("Vomiting");
        }
        if (lower.contains("food") && (lower.contains("refusing") || lower.contains("not eating") || lower.contains("loss of appetite"))) {
            symptoms.add("Loss of appetite");
        }
        if (lower.contains("diarrhea") || lower.contains("loose stool")) {
            symptoms.add("Diarrhea");
        }
        if (lower.contains("cough")) {
            symptoms.add("Coughing");
        }
        if (lower.contains("fever")) {
            symptoms.add("Fever");
        }
        if (lower.contains("letharg")) {
            symptoms.add("Lethargy");
        }

        return symptoms;
    }

    private String extractDuration(String messageText) {
        String lower = messageText.toLowerCase(Locale.ENGLISH);
        if (lower.contains("2 days")) {
            return "2 days";
        }
        if (lower.contains("day")) {
            return "Mentions days";
        }
        if (lower.contains("week")) {
            return "Mentions weeks";
        }
        return "";
    }

    private String calculateSeverity(String messageText, List<String> symptoms, String duration) {
        String lower = messageText.toLowerCase(Locale.ENGLISH);
        int score = 0;

        if (symptoms.contains("Vomiting")) {
            score += 2;
        }
        if (symptoms.contains("Loss of appetite")) {
            score += 1;
        }
        if (lower.contains("blood") || lower.contains("collapse") || lower.contains("weak")) {
            score += 3;
        }
        if (!duration.isBlank()) {
            score += 1;
        }

        if (score >= 5) {
            return "High";
        }
        if (score >= 3) {
            return "Moderate";
        }
        return "Low";
    }

    private String buildRecommendation(String severity, String duration, List<String> symptoms) {
        if ("High".equals(severity)) {
            return "Seek immediate veterinary care";
        }
        if ("Moderate".equals(severity)) {
            return duration.isBlank()
                    ? "Arrange a veterinary review soon"
                    : "Visit veterinarian within 24 hours";
        }
        if (symptoms.contains("Vomiting")) {
            return "Monitor closely and keep hydrated";
        }
        return "Monitor symptoms and consult a veterinarian if they persist";
    }

    private String buildSessionTitle(Pet pet, String messageText) {
        if (pet != null && pet.getName() != null && !pet.getName().isBlank()) {
            return pet.getName() + " care chat";
        }

        String[] words = normalize(messageText).split("\\s+");
        if (words.length == 0) {
            return "Pet care chat";
        }

        int limit = Math.min(words.length, 5);
        return String.join(" ", java.util.Arrays.copyOfRange(words, 0, limit)) + (words.length > 5 ? "..." : "");
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim();
    }

    private String safe(String value) {
        return value == null || value.isBlank() ? "unknown" : value;
    }

    private String safeNumber(Number value) {
        return value == null ? "unknown" : String.valueOf(value);
    }

    private String trimPreview(String value) {
        if (value == null) {
            return "";
        }
        String cleaned = value.replaceAll("\\s+", " ").trim();
        return cleaned.length() <= 90 ? cleaned : cleaned.substring(0, 87) + "...";
    }

    private List<String> asStringList(Object value) {
        if (value instanceof List<?> list) {
            return list.stream().map(String::valueOf).collect(Collectors.toList());
        }
        return List.of();
    }

    private String joinList(List<String> items) {
        if (items == null || items.isEmpty()) {
            return "None detected";
        }
        return items.stream().distinct().collect(Collectors.joining("\n"));
    }

    private static class ChatContext {
        private final String userMessage;
        private final Pet pet;
        private final List<ChatMessageDTO> recentMessages;
        private final List<String> symptoms;
        private final String duration;
        private final String severity;
        private final Map<String, Object> petHistory;
        private final Map<String, Object> knowledge;
        private final String recommendation;

        private ChatContext(String userMessage,
                            Pet pet,
                            List<ChatMessageDTO> recentMessages,
                            List<String> symptoms,
                            String duration,
                            String severity,
                            Map<String, Object> petHistory,
                            Map<String, Object> knowledge,
                            String recommendation) {
            this.userMessage = userMessage;
            this.pet = pet;
            this.recentMessages = recentMessages;
            this.symptoms = symptoms;
            this.duration = duration;
            this.severity = severity;
            this.petHistory = petHistory;
            this.knowledge = knowledge;
            this.recommendation = recommendation;
        }
    }

    private String buildCompletionUrl(String baseUrl) {
        String normalizedBaseUrl = baseUrl == null ? "" : baseUrl.trim();
        if (normalizedBaseUrl.isBlank()) {
            return "https://openrouter.ai/api/v1/chat/completions";
        }
        if (normalizedBaseUrl.endsWith("/chat/completions")) {
            return normalizedBaseUrl;
        }
        return normalizedBaseUrl + "/chat/completions";
    }
}