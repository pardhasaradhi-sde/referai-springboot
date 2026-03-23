package com.referai.backend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.MediaType;
import org.springframework.http.client.MultipartBodyBuilder;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Service
@Slf4j
@RequiredArgsConstructor
public class FileStorageService {

    private final WebClient appwriteWebClient;

    @Value("${app.appwrite.bucket-id}")
    private String bucketId;

    @Value("${app.appwrite.endpoint}")
    private String endpoint;

    @Value("${app.appwrite.project-id}")
    private String projectId;

    public String uploadFile(MultipartFile file, UUID userId) throws Exception {
        try {
            if (file == null || file.isEmpty()) {
                throw new Exception("File is empty");
            }

            if (projectId == null || projectId.isBlank()) {
                throw new Exception("Appwrite project ID is not configured");
            }

            // Generate unique filename
            String originalFilename = file.getOriginalFilename();
            String extension = originalFilename != null && originalFilename.contains(".") 
                ? originalFilename.substring(originalFilename.lastIndexOf("."))
                : "";
            String uniqueFilename = userId + "_" + Instant.now().toEpochMilli() + extension;
            // Appwrite IDs must be <= 36 chars. Raw UUID (36 chars) is safe.
            String fileId = UUID.randomUUID().toString();

            byte[] fileBytes = file.getBytes();
            
            // Build multipart request
            MultipartBodyBuilder builder = new MultipartBodyBuilder();
            builder.part("fileId", fileId);
            String contentType = file.getContentType() != null
                    ? file.getContentType()
                    : MediaType.APPLICATION_OCTET_STREAM_VALUE;
            ByteArrayResource byteArrayResource = new ByteArrayResource(fileBytes) {
                @Override
                public String getFilename() {
                    return uniqueFilename;
                }
            };

            builder.part("file", byteArrayResource)
                    .contentType(MediaType.parseMediaType(contentType));
            
            // Upload to Appwrite
            Map<String, Object> response = appwriteWebClient.post()
                    .uri("/storage/buckets/" + bucketId + "/files")
                    .contentType(MediaType.MULTIPART_FORM_DATA)
                    .body(BodyInserters.fromMultipartData(builder.build()))
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();
            
            if (response == null) {
                throw new Exception("Failed to upload file to Appwrite");
            }

            String storedFileId = response.get("$id") != null
                    ? response.get("$id").toString()
                    : fileId;
            
            // Build CDN URL
            String fileUrl = String.format("%s/storage/buckets/%s/files/%s/view?project=%s",
                endpoint, bucketId, storedFileId, projectId);
            
            log.info("Successfully uploaded file to Appwrite: {}", uniqueFilename);
            return fileUrl;
            
        } catch (WebClientResponseException e) {
            log.error(
                    "Appwrite upload failed with status {} and body: {}",
                    e.getStatusCode(),
                    e.getResponseBodyAsString()
            );
            throw new Exception("File upload failed: " + e.getResponseBodyAsString());
        } catch (Exception e) {
            log.error("Failed to upload file to Appwrite: {}", e.getMessage(), e);
            throw new Exception("File upload failed: " + e.getMessage());
        }
    }

    public void deleteFile(String fileId) throws Exception {
        try {
            appwriteWebClient.delete()
                    .uri("/storage/buckets/" + bucketId + "/files/" + fileId)
                    .retrieve()
                    .bodyToMono(Void.class)
                    .block();
            
            log.info("Successfully deleted file from Appwrite: {}", fileId);
        } catch (Exception e) {
            log.error("Failed to delete file from Appwrite: {}", e.getMessage(), e);
            throw new Exception("File deletion failed: " + e.getMessage());
        }
    }
}
