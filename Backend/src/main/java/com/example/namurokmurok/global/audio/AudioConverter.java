package com.example.namurokmurok.global.audio;

import com.example.namurokmurok.global.common.exception.CustomException;
import com.example.namurokmurok.global.common.exception.ErrorCode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.io.*;
import java.nio.file.Files;

@Slf4j
@Component
public class AudioConverter {

    private static final String FFMPEG_PATH = "ffmpeg";

    /**
     * webm, wav, mp3, m4a → wav 변환
     */
    public File convertWebmToWav(MultipartFile audioFile) {
        File inputAudio = null;
        File outputWav = null;

        try {
            // 0) 원본 파일명 / 확장자 확인
            String originalFilename = audioFile.getOriginalFilename();
            if (originalFilename == null || !originalFilename.contains(".")) {
                log.warn("[AudioConverter] 확장자를 알 수 없는 파일: {}", originalFilename);
                throw new CustomException(ErrorCode.INVALID_REQUEST); // 지원하지 않는 형식
            }

            String ext = originalFilename.substring(originalFilename.lastIndexOf('.') + 1)
                    .toLowerCase();

            // 허용 확장자: webm, wav, mp3, m4a
            if (!ext.equals("webm") && !ext.equals("wav")
                    && !ext.equals("mp3") && !ext.equals("m4a")) {
                log.warn("[AudioConverter] 지원하지 않는 오디오 형식 요청: {}", ext);
                throw new CustomException(ErrorCode.INVALID_REQUEST);
            }

            // 1) 임시 입력 파일 생성 (원본 확장자 유지)
            inputAudio = File.createTempFile("input-", "." + ext);
            audioFile.transferTo(inputAudio);

            // 2) 출력 wav 파일 생성
            outputWav = File.createTempFile("output-", ".wav");

            // 3) FFmpeg 명령 실행 (입력 형식 상관없이 16kHz mono wav로 변환)
            executeFfmpeg(inputAudio, outputWav);

            log.info("[AudioConverter] 변환 성공: InputExt={}, OutputPath={}, Size={} bytes",
                    ext, outputWav.getAbsolutePath(), outputWav.length());

            return outputWav;

        } catch (IOException e) {
            cleanupFile(outputWav);
            log.error("[AudioConverter] 파일 I/O 오류", e);
            throw new CustomException(ErrorCode.FILE_SYSTEM_ERROR, e);

        } catch (InterruptedException e) {
            cleanupFile(outputWav);
            Thread.currentThread().interrupt();
            log.error("[AudioConverter] 프로세스 중단됨", e);
            throw new CustomException(ErrorCode.INTERNAL_SERVER_ERROR, e);

        } catch (CustomException e) {
            cleanupFile(outputWav);
            throw e;

        } catch (Exception e) {
            cleanupFile(outputWav);
            log.error("[AudioConverter] 알 수 없는 오류", e);
            throw new CustomException(ErrorCode.AUDIO_CONVERSION_FAILED, e);

        } finally {
            // 입력 파일 삭제
            cleanupFile(inputAudio);
        }
    }

    private void executeFfmpeg(File input, File output) throws IOException, InterruptedException {
        String[] command = {
                FFMPEG_PATH, "-y",
                "-i", input.getAbsolutePath(),
                "-ac", "1",       // mono
                "-ar", "16000",   // 16kHz
                output.getAbsolutePath()
        };

        ProcessBuilder processBuilder = new ProcessBuilder(command);
        processBuilder.redirectErrorStream(true);
        Process process = processBuilder.start();

        // FFmpeg 로그 읽기 (비동기)
        readStream(process.getInputStream());

        int exitCode = process.waitFor();
        if (exitCode != 0) {
            log.error("[AudioConverter] FFmpeg 비정상 종료 exitCode={}", exitCode);
            throw new CustomException(ErrorCode.AUDIO_CONVERSION_FAILED);
        }
    }

    private void readStream(InputStream inputStream) {
        new Thread(() -> {
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(inputStream))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    // 필요하면 FFmpeg 로그 디버깅용으로 사용
                    // log.debug("[FFmpeg] {}", line);
                }
            } catch (IOException e) {
                log.error("[AudioConverter] 스트림 읽기 실패", e);
            }
        }).start();
    }

    private void cleanupFile(File file) {
        if (file != null && file.exists()) {
            try {
                Files.deleteIfExists(file.toPath());
            } catch (IOException e) {
                log.warn("[AudioConverter] 파일 삭제 실패: {}", file.getAbsolutePath());
            }
        }
    }
}
