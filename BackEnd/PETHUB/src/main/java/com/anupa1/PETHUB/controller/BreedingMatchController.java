package com.anupa1.PETHUB.controller;

import com.anupa1.PETHUB.dto.CreateMatchRequestDTO;
import com.anupa1.PETHUB.dto.MatchResponseDTO;
import com.anupa1.PETHUB.model.BreedingMatchRequest;
import com.anupa1.PETHUB.model.MatchStatus;
import com.anupa1.PETHUB.model.Pet;
import com.anupa1.PETHUB.model.User;
import com.anupa1.PETHUB.repository.BreedingMatchRequestRepository;
import com.anupa1.PETHUB.repository.PetRepository;
import com.anupa1.PETHUB.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/matches")
@CrossOrigin
public class BreedingMatchController {

    private final BreedingMatchRequestRepository matchRepository;
    private final UserRepository userRepository;
    private final PetRepository petRepository;

    public BreedingMatchController(
            BreedingMatchRequestRepository matchRepository,
            UserRepository userRepository,
            PetRepository petRepository) {
        this.matchRepository = matchRepository;
        this.userRepository = userRepository;
        this.petRepository = petRepository;
    }

    @PostMapping("/request")
    public ResponseEntity<?> requestMatch(@RequestBody CreateMatchRequestDTO payload) {
        if (payload.getRequesterEmail() == null || payload.getRequesterPetId() == null || payload.getTargetPetId() == null) {
            return ResponseEntity.badRequest().body(message("Missing required fields"));
        }

        Optional<User> requesterUserOpt = userRepository.findByEmail(payload.getRequesterEmail());
        if (requesterUserOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(message("Requester user not found"));
        }

        Optional<Pet> requesterPetOpt = petRepository.findById(payload.getRequesterPetId());
        Optional<Pet> targetPetOpt = petRepository.findById(payload.getTargetPetId());

        if (requesterPetOpt.isEmpty() || targetPetOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(message("Pet not found"));
        }

        User requesterUser = requesterUserOpt.get();
        Pet requesterPet = requesterPetOpt.get();
        Pet targetPet = targetPetOpt.get();

        if (!requesterPet.getUser().getId().equals(requesterUser.getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(message("Requester does not own the selected pet"));
        }

        if (targetPet.getUser().getId().equals(requesterUser.getId())) {
            return ResponseEntity.badRequest().body(message("You cannot send a breeding request to your own pet"));
        }

        Optional<BreedingMatchRequest> existingPending =
                matchRepository.findByRequesterPetAndTargetPetAndStatus(requesterPet, targetPet, MatchStatus.PENDING);

        if (existingPending.isPresent()) {
            return ResponseEntity.badRequest().body(message("A pending request already exists for this pair"));
        }

        BreedingMatchRequest request = new BreedingMatchRequest();
        request.setRequesterUser(requesterUser);
        request.setRequesterPet(requesterPet);
        request.setTargetPet(targetPet);
        request.setTargetOwner(targetPet.getUser());
        request.setStatus(MatchStatus.PENDING);
        request.setCreatedAt(LocalDateTime.now());

        BreedingMatchRequest saved = matchRepository.save(request);

        return ResponseEntity.ok(MatchResponseDTO.fromEntity(saved));
    }

    @GetMapping("/pending/{ownerEmail}")
    public ResponseEntity<?> getPendingForOwner(
            @PathVariable String ownerEmail,
            @RequestParam(required = false) Long petId,
            @RequestParam(required = false) Long targetPetId) {
        Optional<User> ownerOpt = userRepository.findByEmail(ownerEmail);
        if (ownerOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(message("User not found"));
        }

        User owner = ownerOpt.get();

        List<BreedingMatchRequest> pendingRequests;
        Long selectedPetId = petId != null ? petId : targetPetId;

        if (selectedPetId != null) {
            Optional<Pet> targetPetOpt = petRepository.findById(selectedPetId);
            if (targetPetOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(message("Target pet not found"));
            }

            Pet targetPet = targetPetOpt.get();
            if (targetPet.getUser() == null || !targetPet.getUser().getId().equals(owner.getId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(message("Target pet does not belong to this user"));
            }

            pendingRequests = matchRepository.findPendingByOwnerAndPet(owner, targetPet, MatchStatus.PENDING);
        } else {
            pendingRequests = matchRepository.findByTargetOwnerAndStatusOrderByCreatedAtDesc(owner, MatchStatus.PENDING);
        }

        List<MatchResponseDTO> pending = pendingRequests.stream()
                .map(MatchResponseDTO::fromEntity)
                .collect(Collectors.toList());

        return ResponseEntity.ok(pending);
    }

    @PutMapping("/{matchId}/confirm")
    public ResponseEntity<?> confirmRequest(@PathVariable Long matchId, @RequestParam String ownerEmail) {
        Optional<User> ownerOpt = userRepository.findByEmail(ownerEmail);
        if (ownerOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(message("User not found"));
        }

        Optional<BreedingMatchRequest> requestOpt = matchRepository.findById(matchId);
        if (requestOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(message("Match request not found"));
        }

        BreedingMatchRequest request = requestOpt.get();

        if (!request.getTargetOwner().getId().equals(ownerOpt.get().getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(message("Only target pet owner can confirm"));
        }

        if (request.getStatus() != MatchStatus.PENDING) {
            return ResponseEntity.badRequest().body(message("Only pending requests can be confirmed"));
        }

        request.setStatus(MatchStatus.CONFIRMED);
        request.setConfirmedAt(LocalDateTime.now());

        BreedingMatchRequest updated = matchRepository.save(request);

        return ResponseEntity.ok(MatchResponseDTO.fromEntity(updated));
    }

    @GetMapping("/confirmed/{userEmail}")
    public ResponseEntity<?> getConfirmedForUser(
            @PathVariable String userEmail,
            @RequestParam(required = false) Long petId,
            @RequestParam(required = false) Long targetPetId) {
        Optional<User> userOpt = userRepository.findByEmail(userEmail);
        if (userOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(message("User not found"));
        }

        User user = userOpt.get();

        List<BreedingMatchRequest> confirmedRequests;
        Long selectedPetId = petId != null ? petId : targetPetId;

        if (selectedPetId != null) {
            Optional<Pet> selectedPetOpt = petRepository.findById(selectedPetId);
            if (selectedPetOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(message("Target pet not found"));
            }

            Pet selectedPet = selectedPetOpt.get();
            if (selectedPet.getUser() == null || !selectedPet.getUser().getId().equals(user.getId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(message("Target pet does not belong to this user"));
            }

            confirmedRequests = matchRepository.findConfirmedByParticipantAndPet(user, selectedPet, MatchStatus.CONFIRMED);
        } else {
            confirmedRequests = matchRepository.findByParticipantAndStatusOrderByConfirmedAtDesc(user, MatchStatus.CONFIRMED);
        }

        List<MatchResponseDTO> confirmed = confirmedRequests
                .stream()
                .map(MatchResponseDTO::fromEntity)
                .collect(Collectors.toList());

        return ResponseEntity.ok(confirmed);
    }

    @GetMapping("/sent/{requesterEmail}")
    public ResponseEntity<?> getSentMatches(@PathVariable String requesterEmail) {
        Optional<User> requesterOpt = userRepository.findByEmail(requesterEmail);
        if (requesterOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(message("User not found"));
        }

        List<MatchStatus> activeStatuses = java.util.Arrays.asList(MatchStatus.PENDING, MatchStatus.CONFIRMED);
        List<MatchResponseDTO> sent = matchRepository
                .findByRequesterUserAndStatusIn(requesterOpt.get(), activeStatuses)
                .stream()
                .map(MatchResponseDTO::fromEntity)
                .collect(Collectors.toList());

        return ResponseEntity.ok(sent);
    }

    @PutMapping("/{matchId}/reject")
    public ResponseEntity<?> rejectRequest(@PathVariable Long matchId, @RequestParam String ownerEmail) {
        Optional<User> ownerOpt = userRepository.findByEmail(ownerEmail);
        if (ownerOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(message("User not found"));
        }

        Optional<BreedingMatchRequest> requestOpt = matchRepository.findById(matchId);
        if (requestOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(message("Match request not found"));
        }

        BreedingMatchRequest request = requestOpt.get();

        if (!request.getTargetOwner().getId().equals(ownerOpt.get().getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(message("Only target pet owner can reject"));
        }

        if (request.getStatus() != MatchStatus.PENDING) {
            return ResponseEntity.badRequest().body(message("Only pending requests can be rejected"));
        }

        request.setStatus(MatchStatus.REJECTED);
        BreedingMatchRequest updated = matchRepository.save(request);

        return ResponseEntity.ok(MatchResponseDTO.fromEntity(updated));
    }

    private Map<String, String> message(String text) {
        Map<String, String> map = new HashMap<>();
        map.put("message", text);
        return map;
    }
}
