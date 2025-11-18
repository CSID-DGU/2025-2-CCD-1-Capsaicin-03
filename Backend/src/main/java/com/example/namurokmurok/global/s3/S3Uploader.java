package com.example.namurokmurok.global.s3;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

@Component
@RequiredArgsConstructor
public class S3Uploader {

    private final S3Client s3Client;

    @Value("${cloud.aws.s3.bucket}")
    private String bucket;

    public String upload(String base64Audio, String fileName) {
        byte[] audioBytes = java.util.Base64.getDecoder().decode(base64Audio);

        return uploadBytes(audioBytes, fileName);
    }

    public String uploadBytes(byte[] content, String fileName) {
        PutObjectRequest putObjectRequest = PutObjectRequest.builder()
                .bucket(bucket)
                .key(fileName)
                .contentType("audio/mpeg") // mp3인 경우
                .build();

        s3Client.putObject(putObjectRequest, RequestBody.fromBytes(content));

        // 업로드된 URL 반환
        return s3Client.utilities().getUrl(builder -> builder.bucket(bucket).key(fileName)).toExternalForm();
    }
}
