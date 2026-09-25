package com.simplestore.paymentservice;

import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/payments")
public class PaymentServiceController {

    @GetMapping
    public List<Map<String, Object>> getAll() {
        return List.of(
            Map.of("id", 1, "name", "payment-service demo"),
            Map.of("id", 2, "name", "Sample item")
        );
    }

    @PostMapping
    public Map<String, Object> create(
            @RequestBody(required = false) Map<String, Object> body) {
        return Map.of(
            "status", "CREATED",
            "service", "payment-service",
            "data", body == null ? Map.of() : body
        );
    }
}
