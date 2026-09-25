package com.simplestore.productservice;

import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/products")
public class ProductServiceController {

    @GetMapping
    public List<Map<String, Object>> getAll() {
        return List.of(
            Map.of("id", 1, "name", "product-service demo"),
            Map.of("id", 2, "name", "Sample item")
        );
    }

    @PostMapping
    public Map<String, Object> create(
            @RequestBody(required = false) Map<String, Object> body) {
        return Map.of(
            "status", "CREATED",
            "service", "product-service",
            "data", body == null ? Map.of() : body
        );
    }
}
