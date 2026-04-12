package com.anupa1.PETHUB.controller;

import com.anupa1.PETHUB.model.AdminUser;
import com.anupa1.PETHUB.model.User;
import com.anupa1.PETHUB.repository.AdminUserRepository;
import com.anupa1.PETHUB.repository.PetRepository;
import com.anupa1.PETHUB.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/auth")
@CrossOrigin
public class AuthController {

    private final AdminUserRepository adminUserRepository;
    private final UserRepository userRepository;
    private final PetRepository petRepository;
    private final BCryptPasswordEncoder passwordEncoder;

    public AuthController(AdminUserRepository adminUserRepository,
                          UserRepository userRepository,
                          PetRepository petRepository,
                          BCryptPasswordEncoder passwordEncoder) {
        this.adminUserRepository = adminUserRepository;
        this.userRepository = userRepository;
        this.petRepository = petRepository;
        this.passwordEncoder = passwordEncoder;
    }

    // ADMIN LOGIN (DB-BACKED)
    @PostMapping("/admin/login")
    public ResponseEntity<?> adminLogin(@RequestBody Map<String, String> payload) {
        Map<String, Object> response = new HashMap<>();

        String username = payload.getOrDefault("username", "").trim();
        String password = payload.getOrDefault("password", "");

        if (username.isBlank() || password.isBlank()) {
            response.put("success", false);
            response.put("message", "Username and password are required.");
            return ResponseEntity.badRequest().body(response);
        }

        Optional<AdminUser> adminUser = adminUserRepository.findByUsername(username);
        if (adminUser.isEmpty()) {
            response.put("success", false);
            response.put("message", "Invalid username or password.");
            return ResponseEntity.badRequest().body(response);
        }

        if (!passwordEncoder.matches(password, adminUser.get().getPassword())) {
            response.put("success", false);
            response.put("message", "Invalid username or password.");
            return ResponseEntity.badRequest().body(response);
        }

        response.put("success", true);
        response.put("message", "Admin login successful!");
        response.put("admin", Map.of("username", adminUser.get().getUsername()));
        return ResponseEntity.ok(response);
    }

    // REGISTER
    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody User user) {
        Map<String, Object> response = new HashMap<>();

        if (userRepository.findByEmail(user.getEmail()).isPresent()) {
            response.put("success", false);
            response.put("message", "Email already exists!");
            return ResponseEntity.badRequest().body(response);
        }

        user.setPassword(passwordEncoder.encode(user.getPassword()));
        User savedUser = userRepository.save(user);

        response.put("success", true);
        response.put("message", "User registered successfully!");
        response.put("user", Map.of(
            "id", savedUser.getId(),
            "name", savedUser.getName(),
            "email", savedUser.getEmail()
        ));

        return ResponseEntity.ok(response);
    }

    // LOGIN
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody User user) {
        Map<String, Object> response = new HashMap<>();

        Optional<User> existingUser = userRepository.findByEmail(user.getEmail());

        if (existingUser.isEmpty()) {
            response.put("success", false);
            response.put("message", "User not found!");
            return ResponseEntity.badRequest().body(response);
        }

        if (!passwordEncoder.matches(user.getPassword(), existingUser.get().getPassword())) {
            response.put("success", false);
            response.put("message", "Invalid password!");
            return ResponseEntity.badRequest().body(response);
        }

        User loggedInUser = existingUser.get();
        response.put("success", true);
        response.put("message", "Login successful!");
        response.put("user", Map.of(
            "id", loggedInUser.getId(),
            "name", loggedInUser.getName(),
            "email", loggedInUser.getEmail()
        ));

        return ResponseEntity.ok(response);
    }

    // FORGOT PASSWORD
    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestBody Map<String, String> payload) {
        Map<String, Object> response = new HashMap<>();

        String email = payload.get("email");
        String newPassword = payload.get("newPassword");

        if (email == null || email.isBlank() || newPassword == null || newPassword.length() < 6) {
            response.put("success", false);
            response.put("message", "Invalid email or password (minimum 6 characters required)");
            return ResponseEntity.badRequest().body(response);
        }

        Optional<User> existingUser = userRepository.findByEmail(email);
        if (existingUser.isEmpty()) {
            response.put("success", false);
            response.put("message", "User not found!");
            return ResponseEntity.badRequest().body(response);
        }

        User user = existingUser.get();
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        response.put("success", true);
        response.put("message", "Password reset successful!");
        return ResponseEntity.ok(response);
    }

    // ADMIN: GET ALL USERS (SAFE FIELDS ONLY)
    @GetMapping("/users")
    public ResponseEntity<?> getAllUsers() {
        List<Map<String, Object>> users = userRepository.findAll().stream()
                .map(user -> {
                    Map<String, Object> safeUser = new HashMap<>();
                    safeUser.put("id", user.getId());
                    safeUser.put("name", user.getName() == null ? "" : user.getName());
                    safeUser.put("email", user.getEmail() == null ? "" : user.getEmail());
                    return safeUser;
                })
                .toList();

        return ResponseEntity.ok(users);
    }

    // ADMIN: UPDATE USER (SAFE FIELDS ONLY)
    @PutMapping("/users/{id}")
    public ResponseEntity<?> updateUser(@PathVariable Long id,
                                        @RequestBody Map<String, String> payload) {
        Optional<User> userOpt = userRepository.findById(id);

        if (userOpt.isEmpty()) {
            return ResponseEntity.status(404).body(Map.of(
                    "success", false,
                    "message", "User not found"
            ));
        }

        String name = payload.getOrDefault("name", "").trim();
        String email = payload.getOrDefault("email", "").trim();

        if (name.isBlank() || email.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "Name and email are required"
            ));
        }

        Optional<User> existingByEmail = userRepository.findByEmail(email);
        if (existingByEmail.isPresent() && !existingByEmail.get().getId().equals(id)) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "Email already exists"
            ));
        }

        User user = userOpt.get();
        user.setName(name);
        user.setEmail(email);
        User savedUser = userRepository.save(user);

        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "User updated successfully",
                "user", Map.of(
                        "id", savedUser.getId(),
                        "name", savedUser.getName() == null ? "" : savedUser.getName(),
                        "email", savedUser.getEmail() == null ? "" : savedUser.getEmail()
                )
        ));
    }

    // ADMIN: DELETE USER (+ RELATED PET RECORDS)
    @DeleteMapping("/users/{id}")
    public ResponseEntity<?> deleteUser(@PathVariable Long id) {
        Optional<User> userOpt = userRepository.findById(id);

        if (userOpt.isEmpty()) {
            return ResponseEntity.status(404).body(Map.of(
                    "success", false,
                    "message", "User not found"
            ));
        }

        User user = userOpt.get();

        petRepository.deleteAll(petRepository.findByUser(user));
        userRepository.delete(user);

        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "User deleted successfully"
        ));
    }
}