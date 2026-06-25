package com.anupa1.PETHUB;

import io.github.bonigarcia.wdm.WebDriverManager;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.chrome.ChromeOptions;

import static org.junit.jupiter.api.Assertions.assertTrue;

class SeleniumSmokeTest {

    private WebDriver driver;

    @BeforeEach
    void setUp() {
        // Auto setup ChromeDriver
        WebDriverManager.chromedriver().setup();

        ChromeOptions options = new ChromeOptions();
        options.addArguments("--start-maximized");
        options.addArguments("--disable-gpu");

        driver = new ChromeDriver(options);
    }

    @AfterEach
    void tearDown() {
        if (driver != null) {
            driver.quit(); // browser close after test
        }
    }

    @Test
    void webPageLoadsInBrowser() throws InterruptedException {

        // backend URL (Spring Boot)
        String targetUrl = "http://localhost:8080";

        driver.get(targetUrl);

        // DEBUG: keep browser open for 5 sec
        Thread.sleep(5000);

        String title = driver.getTitle();
        System.out.println("Page Title: " + title);

        // simple validation (safe for smoke test)
        assertTrue(driver.getPageSource() != null && !driver.getPageSource().isEmpty(),
                "Page should load with content");
    }
}