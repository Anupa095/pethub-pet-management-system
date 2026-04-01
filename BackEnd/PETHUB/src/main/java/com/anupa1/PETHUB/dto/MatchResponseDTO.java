package com.anupa1.PETHUB.dto;

import com.anupa1.PETHUB.model.BreedingMatchRequest;

import java.time.LocalDateTime;

public class MatchResponseDTO {

    private Long id;
    private String status;
    private LocalDateTime createdAt;
    private LocalDateTime confirmedAt;

    private Long requesterPetId;
    private String requesterPetName;
    private String requesterPetBreed;
    private String requesterPetImageUrl;
    private String requesterOwnerName;
    private String requesterOwnerEmail;

    private Long targetPetId;
    private String targetPetName;
    private String targetPetBreed;
    private String targetPetImageUrl;
    private String targetOwnerName;
    private String targetOwnerEmail;

    public static MatchResponseDTO fromEntity(BreedingMatchRequest request) {
        MatchResponseDTO dto = new MatchResponseDTO();
        dto.id = request.getId();
        dto.status = request.getStatus().name();
        dto.createdAt = request.getCreatedAt();
        dto.confirmedAt = request.getConfirmedAt();

        dto.requesterPetId = request.getRequesterPet().getId();
        dto.requesterPetName = request.getRequesterPet().getName();
        dto.requesterPetBreed = request.getRequesterPet().getBreed();
        dto.requesterPetImageUrl = request.getRequesterPet().getImageUrl();
        dto.requesterOwnerName = request.getRequesterUser().getName();
        dto.requesterOwnerEmail = request.getRequesterUser().getEmail();

        dto.targetPetId = request.getTargetPet().getId();
        dto.targetPetName = request.getTargetPet().getName();
        dto.targetPetBreed = request.getTargetPet().getBreed();
        dto.targetPetImageUrl = request.getTargetPet().getImageUrl();
        dto.targetOwnerName = request.getTargetOwner().getName();
        dto.targetOwnerEmail = request.getTargetOwner().getEmail();

        return dto;
    }

    public Long getId() {
        return id;
    }

    public String getStatus() {
        return status;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getConfirmedAt() {
        return confirmedAt;
    }

    public Long getRequesterPetId() {
        return requesterPetId;
    }

    public String getRequesterPetName() {
        return requesterPetName;
    }

    public String getRequesterPetBreed() {
        return requesterPetBreed;
    }

    public String getRequesterPetImageUrl() {
        return requesterPetImageUrl;
    }

    public String getRequesterOwnerName() {
        return requesterOwnerName;
    }

    public String getRequesterOwnerEmail() {
        return requesterOwnerEmail;
    }

    public Long getTargetPetId() {
        return targetPetId;
    }

    public String getTargetPetName() {
        return targetPetName;
    }

    public String getTargetPetBreed() {
        return targetPetBreed;
    }

    public String getTargetPetImageUrl() {
        return targetPetImageUrl;
    }

    public String getTargetOwnerName() {
        return targetOwnerName;
    }

    public String getTargetOwnerEmail() {
        return targetOwnerEmail;
    }
}
