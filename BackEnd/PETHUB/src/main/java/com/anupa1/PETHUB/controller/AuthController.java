package com.anupa1.PETHUB.controller;

import com.anupa1.PETHUB.model.User;
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

    private final UserRepository userRepository;
    private final BCryptPasswordEncoder passwordEncoder;

    public AuthController(UserRepository userRepository,
                          BCryptPasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
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
}