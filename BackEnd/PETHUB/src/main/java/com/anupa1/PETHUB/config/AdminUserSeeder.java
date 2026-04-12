package com.anupa1.PETHUB.config;

import com.anupa1.PETHUB.model.AdminUser;
import com.anupa1.PETHUB.repository.AdminUserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

@Configuration
public class AdminUserSeeder {

    @Bean
    public CommandLineRunner seedAdminUser(AdminUserRepository adminUserRepository,
                                           BCryptPasswordEncoder passwordEncoder,
                                           @Value("${app.admin.username:Anupa}") String adminUsername,
                                           @Value("${app.admin.password:Anupa123}") String adminPassword) {
        return args -> {
            if (adminUserRepository.findByUsername(adminUsername).isEmpty()) {
                AdminUser adminUser = new AdminUser(
                        adminUsername,
                        passwordEncoder.encode(adminPassword)
                );
                adminUserRepository.save(adminUser);
            }
        };
    }
}
