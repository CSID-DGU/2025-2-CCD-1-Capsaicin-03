package com.example.namurokmurok;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@EnableAsync
@SpringBootApplication
public class NamurokmurokApplication {

    public static void main(String[] args) {
        SpringApplication.run(NamurokmurokApplication.class, args);
    }

}
