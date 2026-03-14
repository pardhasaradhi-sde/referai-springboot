package com.referai.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ExtractJdResponse {
    private boolean success;
    private boolean isUrl;
    private String source;
    private String jobTitle;
    private String company;
    private String location;
    private String description;
    private String error;
    private String fallbackMessage;
}
