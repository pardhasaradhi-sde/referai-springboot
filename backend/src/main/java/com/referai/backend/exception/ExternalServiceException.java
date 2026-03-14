package com.referai.backend.exception;

import org.springframework.http.HttpStatus;

/**
 * Exception for upstream service failures (Gemini/Appwrite/etc.) where
 * we want to return a controlled HTTP status and message to the client.
 */
public class ExternalServiceException extends RuntimeException {

    private final HttpStatus status;

    public ExternalServiceException(String message, HttpStatus status) {
        super(message);
        this.status = status;
    }

    public ExternalServiceException(String message, HttpStatus status, Throwable cause) {
        super(message, cause);
        this.status = status;
    }

    public HttpStatus getStatus() {
        return status;
    }
}
