package com.anupa1.PETHUB.dto;

public class CreateMatchRequestDTO {
    private String requesterEmail;
    private Long requesterPetId;
    private Long targetPetId;

    public String getRequesterEmail() {
        return requesterEmail;
    }

    public void setRequesterEmail(String requesterEmail) {
        this.requesterEmail = requesterEmail;
    }

    public Long getRequesterPetId() {
        return requesterPetId;
    }

    public void setRequesterPetId(Long requesterPetId) {
        this.requesterPetId = requesterPetId;
    }

    public Long getTargetPetId() {
        return targetPetId;
    }

    public void setTargetPetId(Long targetPetId) {
        this.targetPetId = targetPetId;
    }
}
