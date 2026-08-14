package com.anupa1.PETHUB.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "pet_posts")
public class Post {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "pet_id")
    private Pet pet;

    private String imageUrl;

    @Column(columnDefinition = "text")
    private String caption;

    private LocalDateTime createdAt;

    private Integer likes = 0;

    public Post() {}

    public Long getId() { return id; }
    public Pet getPet() { return pet; }
    public String getImageUrl() { return imageUrl; }
    public String getCaption() { return caption; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public Integer getLikes() { return likes; }

    public void setPet(Pet pet) { this.pet = pet; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }
    public void setCaption(String caption) { this.caption = caption; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public void setLikes(Integer likes) { this.likes = likes; }
}
