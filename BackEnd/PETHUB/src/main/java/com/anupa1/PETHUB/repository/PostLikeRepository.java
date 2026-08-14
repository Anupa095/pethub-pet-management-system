package com.anupa1.PETHUB.repository;

import com.anupa1.PETHUB.model.Post;
import com.anupa1.PETHUB.model.PostLike;
import com.anupa1.PETHUB.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PostLikeRepository extends JpaRepository<PostLike, Long> {
    Optional<PostLike> findByPostAndUser(Post post, User user);
    long countByPost(Post post);
}
