package com.referai.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UploadResumeResponse {
    private boolean success;
    private String fileUrl;
    private String fileName;
    private String extractedText;
    private Integer wordCount;
    private Instant uploadedAt;
    private String error;
}
