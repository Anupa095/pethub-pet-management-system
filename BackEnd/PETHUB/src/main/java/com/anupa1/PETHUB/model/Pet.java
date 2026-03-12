package com.anupa1.PETHUB.model;

import jakarta.persistence.*;

@Entity
@Table(name = "pets")
public class Pet {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
    private String type;
    private String breed;
    private String gender;
    private Integer age;
    private String imageUrl; // store uploaded image path or URL

    @ManyToOne
    @JoinColumn(name = "user_id")
    private User user;  // owner of the pet

    public Pet() {}

    // Getters and setters
    public Long getId() { return id; }
    public String getName() { return name; }
    public String getType() { return type; }
    public String getBreed() { return breed; }
    public String getGender() { return gender; }
    public Integer getAge() { return age; }
    public String getImageUrl() { return imageUrl; }
    public User getUser() { return user; }

    public void setName(String name) { this.name = name; }
    public void setType(String type) { this.type = type; }
    public void setBreed(String breed) { this.breed = breed; }
    public void setGender(String gender) { this.gender = gender; }
    public void setAge(Integer age) { this.age = age; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }
    public void setUser(User user) { this.user = user; }
}