package com.referai.backend.exception;

/**
 * Thrown when an entity requested by ID does not exist.
 * Maps to HTTP 404 via GlobalExceptionHandler.
 */
public class ResourceNotFoundException extends RuntimeException {
    public ResourceNotFoundException(String message) {
        super(message);
    }
}
