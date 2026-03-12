package com.anupa1.PETHUB.repository;

import com.anupa1.PETHUB.model.Pet;
import com.anupa1.PETHUB.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface PetRepository extends JpaRepository<Pet, Long> {
    List<Pet> findByUser(User user); // only pets of this user
}