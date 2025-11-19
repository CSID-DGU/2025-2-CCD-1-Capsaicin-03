package com.example.namurokmurok;

import com.example.namurokmurok.global.s3.S3Uploader;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Base64;

@SpringBootTest
class S3UploaderTest {

    @Autowired
    private S3Uploader s3Uploader;

    @Test
    void 실제_오디오_파일_업로드_테스트() throws IOException {
        // 1. 테스트할 실제 오디오 파일 경로 (src/test/resources/test_audio.mp3)
        String filePath = "src/test/java/com/example/namurokmurok/resources/test_audio.wav";

        Path path = Paths.get(filePath);
        if (!Files.exists(path)) {
            throw new RuntimeException("테스트용 오디오 파일이 없습니다! 경로를 확인해주세요: " + path.toAbsolutePath());
        }

        // 2. 파일을 읽어서 바이트 배열로 변환 (AI 서버가 파일을 읽는 과정 시뮬레이션)
        byte[] audioBytes = Files.readAllBytes(path);

        // 3. 바이트를 Base64 문자열로 인코딩 (AI 서버가 응답 주는 형태 시뮬레이션)
        String base64Audio = Base64.getEncoder().encodeToString(audioBytes);

        System.out.println(">>> 파일 읽기 및 Base64 인코딩 완료 (길이: " + base64Audio.length() + ")");

        // 4. S3 업로드 실행
        // 저장될 경로: audio/test/real_sound.mp3
        String s3Path = "audio/test/real_sound.mp3";

        System.out.println(">>> S3 업로드 시작...");
        String uploadedUrl = s3Uploader.upload(base64Audio, s3Path);

        // 5. 결과 확인
        System.out.println(">>> 업로드 성공!");
        System.out.println(">>> URL: " + uploadedUrl);
    }
}
