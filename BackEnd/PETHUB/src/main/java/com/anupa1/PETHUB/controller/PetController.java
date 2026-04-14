package com.anupa1.PETHUB.controller;

import com.anupa1.PETHUB.model.Pet;
import com.anupa1.PETHUB.model.User;
import com.anupa1.PETHUB.model.MatchStatus;
import com.anupa1.PETHUB.model.BreedingMatchRequest;
import com.anupa1.PETHUB.repository.PetRepository;
import com.anupa1.PETHUB.repository.UserRepository;
import com.anupa1.PETHUB.repository.BreedingMatchRequestRepository;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.client.RestTemplate;

import org.springframework.util.StringUtils;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.core.ParameterizedTypeReference;

import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.core.io.ByteArrayResource;

import java.io.File;
import java.io.IOException;

import java.nio.file.*;
import java.util.*;

@RestController
@RequestMapping("/pets")
@CrossOrigin
public class PetController {

    private final PetRepository petRepository;
    private final UserRepository userRepository;
    private final BreedingMatchRequestRepository breedingMatchRequestRepository;

    public PetController(PetRepository petRepository, UserRepository userRepository, BreedingMatchRequestRepository breedingMatchRequestRepository) {
        this.petRepository = petRepository;
        this.userRepository = userRepository;
        this.breedingMatchRequestRepository = breedingMatchRequestRepository;
    }

    @Value("${file.upload-dir}")
    private String uploadDir;

    // =========================
    // Get All Pets
    // =========================
    @GetMapping
    public List<Pet> getAllPets() {
        return petRepository.findAll();
    }

    // =========================
    // Get Pet By ID
    // =========================
    @GetMapping("/{id}")
    public ResponseEntity<?> getPetById(@PathVariable Long id) {

        Optional<Pet> pet = petRepository.findById(id);

        if (pet.isPresent()) {
            return ResponseEntity.ok(pet.get());
        }

        return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Pet not found");
    }

    // =========================
    // Add Pet With Image + AI
    // =========================
    @PostMapping("/add")
    public ResponseEntity<?> addPet(
            @RequestParam String name,
            @RequestParam String type,
            @RequestParam String breed,
            @RequestParam String gender,
            @RequestParam Integer age,
            @RequestParam String userEmail,
            @RequestParam(required = false) MultipartFile image) {

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

        // =========================
        // AI Image Validation
        // =========================
        if (image != null && !image.isEmpty()) {

            try {

                RestTemplate restTemplate = new RestTemplate();

                HttpHeaders headers = new HttpHeaders();
                headers.setContentType(MediaType.MULTIPART_FORM_DATA);

                MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();

                body.add("file", new ByteArrayResource(image.getBytes()) {
                    @Override
                    public String getFilename() {
                        return image.getOriginalFilename();
                    }
                });

                HttpEntity<MultiValueMap<String, Object>> requestEntity = new HttpEntity<>(body, headers);

                String pythonApiUrl = "http://localhost:8000/verify-pet-image";

                    ResponseEntity<Map<String, Object>> pythonResponse = restTemplate.exchange(
                            pythonApiUrl,
                            HttpMethod.POST,
                            requestEntity,
                            new ParameterizedTypeReference<Map<String, Object>>() {}
                    );

                if (pythonResponse.getStatusCode().is2xxSuccessful()
                        && pythonResponse.getBody() != null) {

                    Boolean isValid = (Boolean) pythonResponse.getBody().get("is_valid");

                    if (isValid == null || !isValid) {
                        return ResponseEntity.badRequest()
                                .body("Invalid image. Upload a cat or dog image.");
                    }
                }

            } catch (Exception e) {

                e.printStackTrace();

                return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                        .body("AI Image Verification Service unavailable.");
            }
        }

        // =========================
        // Save Image
        // =========================
        if (image != null && !image.isEmpty()) {

            try {

                File dir = new File(uploadDir).getAbsoluteFile();

                if (!dir.exists()) {
                    dir.mkdirs();
                }

                String originalFilename = StringUtils.cleanPath(image.getOriginalFilename());
                String fileName = UUID.randomUUID() + "_" + originalFilename;

                Path filePath = Paths.get(uploadDir, fileName);

                Files.copy(image.getInputStream(), filePath,
                        StandardCopyOption.REPLACE_EXISTING);

                pet.setImageUrl("/uploads/" + fileName);

            } catch (IOException e) {

                e.printStackTrace();

                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                        .body("Image upload failed.");
            }
        }

        Pet savedPet = petRepository.save(pet);

        return ResponseEntity.ok(savedPet);
    }

    // =========================
    // Get Logged User Pets
    // =========================
    @GetMapping("/my-pets/{userEmail}")
    public ResponseEntity<?> getMyPets(@PathVariable String userEmail) {

        Optional<User> userOpt = userRepository.findByEmail(userEmail);

        if (userOpt.isEmpty()) {
            return ResponseEntity.badRequest().body("User not found");
        }

        List<Pet> pets = petRepository.findByUserOrderByIdAsc(userOpt.get());

        return ResponseEntity.ok(pets);
    }

    // =========================
    // Delete Pet
    // =========================
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deletePet(@PathVariable Long id) {

        Optional<Pet> petOpt = petRepository.findById(id);

        if (petOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body("Pet not found");
        }

        Pet pet = petOpt.get();

        try {

            // 1. Delete all breeding match requests that reference this pet (regardless of status)
            List<BreedingMatchRequest> allMatchRequests = breedingMatchRequestRepository
                    .findByStatusAndPet(MatchStatus.PENDING, pet);
            if (!allMatchRequests.isEmpty()) {
                breedingMatchRequestRepository.deleteAll(allMatchRequests);
            }

            List<BreedingMatchRequest> confirmedMatches = breedingMatchRequestRepository
                    .findByStatusAndPet(MatchStatus.CONFIRMED, pet);
            if (!confirmedMatches.isEmpty()) {
                breedingMatchRequestRepository.deleteAll(confirmedMatches);
            }

            List<BreedingMatchRequest> rejectedMatches = breedingMatchRequestRepository
                    .findByStatusAndPet(MatchStatus.REJECTED, pet);
            if (!rejectedMatches.isEmpty()) {
                breedingMatchRequestRepository.deleteAll(rejectedMatches);
            }

            // 2. Delete image file
            if (pet.getImageUrl() != null && !pet.getImageUrl().isEmpty()) {
                String fileName = pet.getImageUrl().replace("/uploads/", "");
                Path filePath = Paths.get(uploadDir, fileName);
                Files.deleteIfExists(filePath);
            }

            // 3. Finally delete the pet
            petRepository.deleteById(id);

            return ResponseEntity.ok("Pet deleted successfully");

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Failed to delete pet: " + e.getMessage());
        }
    }

    // =========================
    // Update Pet
    // =========================
    @PutMapping("/{id}")
    public ResponseEntity<?> updatePet(
            @PathVariable Long id,
            @RequestBody Pet updatedPet) {

        Optional<Pet> petOpt = petRepository.findById(id);

        if (petOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body("Pet not found");
        }

        Pet pet = petOpt.get();

        pet.setName(updatedPet.getName());
        pet.setType(updatedPet.getType());
        pet.setBreed(updatedPet.getBreed());
        pet.setGender(updatedPet.getGender());
        pet.setAge(updatedPet.getAge());

        petRepository.save(pet);

        return ResponseEntity.ok(pet);
    }

    // =========================
    // Serve Pet Image
    // =========================
    @GetMapping("/image/{id}")
    public ResponseEntity<Resource> serveImage(@PathVariable Long id) {

        try {

            Optional<Pet> pet = petRepository.findById(id);

            if (pet.isPresent() && pet.get().getImageUrl() != null) {

                String fileName = pet.get().getImageUrl().replace("/uploads/", "");

                Path path = Paths.get(uploadDir, fileName);

                Resource resource = new UrlResource(path.toUri());

                if (resource.exists() || resource.isReadable()) {

                    String contentType = Files.probeContentType(path);

                    if (contentType == null) {
                        contentType = "image/jpeg";
                    }

                    return ResponseEntity.ok()
                            .contentType(MediaType.parseMediaType(contentType))
                            .body(resource);
                }
            }

            return ResponseEntity.notFound().build();

        } catch (Exception e) {

            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}