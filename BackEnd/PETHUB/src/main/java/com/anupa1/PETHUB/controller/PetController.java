package com.anupa1.PETHUB.controller;

import com.anupa1.PETHUB.model.Pet;
import com.anupa1.PETHUB.model.User;
import com.anupa1.PETHUB.repository.PetRepository;
import com.anupa1.PETHUB.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/pets")
@CrossOrigin
public class PetController {

    private final PetRepository petRepository;
    private final UserRepository userRepository;

    @Value("${file.upload-dir}")
    private String uploadDir; // from application.properties, e.g., "uploads"

    public PetController(PetRepository petRepository, UserRepository userRepository) {
        this.petRepository = petRepository;
        this.userRepository = userRepository;
    }

    // =======================
    // Add Pet with Image
    // =======================
    @PostMapping("/add")
    public ResponseEntity<?> addPet(
            @RequestParam String name,
            @RequestParam String type,
            @RequestParam String breed,
            @RequestParam String gender,
            @RequestParam Integer age,
            @RequestParam String userEmail,
            @RequestParam(required = false) MultipartFile image
    ) {
        Optional<User> userOpt = userRepository.findByEmail(userEmail);
        if (userOpt.isEmpty()) {
            return ResponseEntity.badRequest().body("User not found");
        }

        Pet pet = new Pet();
        pet.setName(name);
        pet.setType(type);
        pet.setBreed(breed);
        pet.setGender(gender);
        pet.setAge(age);
        pet.setUser(userOpt.get());

        // =======================
        // Handle Image Upload
        // =======================
        if (image != null && !image.isEmpty()) {
            try {
                // Create folder if not exist
                File dir = new File(uploadDir).getAbsoluteFile();
                if (!dir.exists()) dir.mkdirs();

                // Generate unique file name
                String originalFilename = StringUtils.cleanPath(image.getOriginalFilename());
                String fileName = UUID.randomUUID() + "_" + originalFilename;

                File dest = new File(dir, fileName);
                image.transferTo(dest); // save file
                pet.setImageUrl("/uploads/" + fileName);

                System.out.println("Image saved at: " + dest.getAbsolutePath()); // debug

            } catch (IOException e) {
                e.printStackTrace();
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                        .body("Failed to upload image: " + e.getMessage());
            }
        }

        Pet savedPet = petRepository.save(pet);
        return ResponseEntity.ok(savedPet);
    }

    // =======================
    // Get pets of logged-in user
    // =======================
    @GetMapping("/my-pets/{userEmail}")
    public ResponseEntity<?> getMyPets(@PathVariable String userEmail) {
        Optional<User> userOpt = userRepository.findByEmail(userEmail);
        if (userOpt.isEmpty()) {
            return ResponseEntity.badRequest().body("User not found");
        }

        List<Pet> pets = petRepository.findByUser(userOpt.get());
        return ResponseEntity.ok(pets);
    }

    // =======================
    // Get all pets (optional)
    // =======================
    @GetMapping
    public List<Pet> getAllPets() {
        return petRepository.findAll();
    }
}