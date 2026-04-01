package com.anupa1.PETHUB.model;

import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "breeding_match_requests")
public class BreedingMatchRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "requester_user_id")
    private User requesterUser;

    @ManyToOne(optional = false)
    @JoinColumn(name = "target_owner_id")
    private User targetOwner;

    @ManyToOne(optional = false)
    @JoinColumn(name = "requester_pet_id")
    private Pet requesterPet;

    @ManyToOne(optional = false)
    @JoinColumn(name = "target_pet_id")
    private Pet targetPet;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private MatchStatus status = MatchStatus.PENDING;

    @Column(nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    private LocalDateTime confirmedAt;

    public Long getId() {
        return id;
    }

    public User getRequesterUser() {
        return requesterUser;
    }

    public void setRequesterUser(User requesterUser) {
        this.requesterUser = requesterUser;
    }

    public User getTargetOwner() {
        return targetOwner;
    }

    public void setTargetOwner(User targetOwner) {
        this.targetOwner = targetOwner;
    }

    public Pet getRequesterPet() {
        return requesterPet;
    }

    public void setRequesterPet(Pet requesterPet) {
        this.requesterPet = requesterPet;
    }

    public Pet getTargetPet() {
        return targetPet;
    }

    public void setTargetPet(Pet targetPet) {
        this.targetPet = targetPet;
    }

    public MatchStatus getStatus() {
        return status;
    }

    public void setStatus(MatchStatus status) {
        this.status = status;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getConfirmedAt() {
        return confirmedAt;
    }

    public void setConfirmedAt(LocalDateTime confirmedAt) {
        this.confirmedAt = confirmedAt;
    }
}
