package com.anupa1.PETHUB.repository;

import com.anupa1.PETHUB.model.Post;
import com.anupa1.PETHUB.model.Pet;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PostRepository extends JpaRepository<Post, Long> {
    List<Post> findByPetOrderByCreatedAtDesc(Pet pet);
}
