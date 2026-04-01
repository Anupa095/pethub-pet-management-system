package com.anupa1.PETHUB.repository;

import com.anupa1.PETHUB.model.BreedingMatchRequest;
import com.anupa1.PETHUB.model.MatchStatus;
import com.anupa1.PETHUB.model.Pet;
import com.anupa1.PETHUB.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface BreedingMatchRequestRepository extends JpaRepository<BreedingMatchRequest, Long> {

    Optional<BreedingMatchRequest> findByRequesterPetAndTargetPetAndStatus(Pet requesterPet, Pet targetPet, MatchStatus status);

    List<BreedingMatchRequest> findByTargetOwnerAndStatusOrderByCreatedAtDesc(User targetOwner, MatchStatus status);

    List<BreedingMatchRequest> findByTargetOwnerAndTargetPetAndStatusOrderByCreatedAtDesc(User targetOwner, Pet targetPet, MatchStatus status);

    List<BreedingMatchRequest> findByRequesterUserAndStatusOrderByConfirmedAtDesc(User requesterUser, MatchStatus status);

    @Query("SELECT b FROM BreedingMatchRequest b WHERE b.status = :status AND (b.requesterUser = :user OR b.targetOwner = :user) ORDER BY b.confirmedAt DESC")
    List<BreedingMatchRequest> findByParticipantAndStatusOrderByConfirmedAtDesc(@Param("user") User user, @Param("status") MatchStatus status);

    @Query("SELECT b FROM BreedingMatchRequest b WHERE b.status = :status AND (b.requesterPet = :pet OR b.targetPet = :pet) ORDER BY b.confirmedAt DESC")
    List<BreedingMatchRequest> findByStatusAndPet(@Param("status") MatchStatus status, @Param("pet") Pet pet);

        @Query("SELECT b FROM BreedingMatchRequest b WHERE b.status = :status AND b.targetOwner = :owner AND b.targetPet = :pet ORDER BY b.createdAt DESC")
        List<BreedingMatchRequest> findPendingByOwnerAndPet(@Param("owner") User owner, @Param("pet") Pet pet, @Param("status") MatchStatus status);

        @Query("SELECT b FROM BreedingMatchRequest b WHERE b.status = :status AND (b.requesterUser = :user OR b.targetOwner = :user) AND (b.requesterPet = :pet OR b.targetPet = :pet) ORDER BY b.confirmedAt DESC")
        List<BreedingMatchRequest> findConfirmedByParticipantAndPet(
            @Param("user") User user,
            @Param("pet") Pet pet,
            @Param("status") MatchStatus status
        );

    @Query("SELECT b FROM BreedingMatchRequest b WHERE b.requesterUser = :user AND b.status IN :statuses ORDER BY b.createdAt DESC")
    List<BreedingMatchRequest> findByRequesterUserAndStatusIn(@Param("user") User user, @Param("statuses") List<MatchStatus> statuses);
}
