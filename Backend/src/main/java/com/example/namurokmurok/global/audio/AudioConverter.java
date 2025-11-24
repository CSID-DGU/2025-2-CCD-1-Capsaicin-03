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
     * webm → wav 변환
     */
    public File convertWebmToWav(MultipartFile webmFile) {
        File inputWebm = null;
        File outputWav = null;

        try {
            // 1) 임시 webm 파일 생성
            inputWebm = File.createTempFile("input-", ".webm");
            webmFile.transferTo(inputWebm);

            // 2) 출력 wav 파일 생성
            outputWav = File.createTempFile("output-", ".wav");

            // 3) FFmpeg 명령 실행
            executeFfmpeg(inputWebm, outputWav);

            log.info("[AudioConverter] 변환 성공: Path={}, Size={} bytes",
                    outputWav.getAbsolutePath(), outputWav.length());

            return outputWav;

        } catch (IOException e) {
            cleanupFile(outputWav);
            // 파일 시스템 에러로 분류
            log.error("[AudioConverter] 파일 I/O 오류", e);
            throw new CustomException(ErrorCode.FILE_SYSTEM_ERROR, e);

        } catch (InterruptedException e) {
            cleanupFile(outputWav);
            Thread.currentThread().interrupt();
            log.error("[AudioConverter] 프로세스 중단됨", e);
            throw new CustomException(ErrorCode.INTERNAL_SERVER_ERROR, e);

        } catch (CustomException e) {
            // 이미 executeFfmpeg 내부에서 던진 CustomException은 그대로 전달
            cleanupFile(outputWav);
            throw e;

        } catch (Exception e) {
            cleanupFile(outputWav);
            log.error("[AudioConverter] 알 수 없는 오류", e);
            // 그 외 모든 에러는 변환 실패로 간주
            throw new CustomException(ErrorCode.AUDIO_CONVERSION_FAILED, e);

        } finally {
            // 입력 파일 삭제
            cleanupFile(inputWebm);
        }
    }

    private void executeFfmpeg(File input, File output) throws IOException, InterruptedException {
        String[] command = {
                FFMPEG_PATH, "-y", "-i", input.getAbsolutePath(),
                "-ac", "1", "-ar", "16000", output.getAbsolutePath()
        };

        ProcessBuilder processBuilder = new ProcessBuilder(command);
        processBuilder.redirectErrorStream(true);
        Process process = processBuilder.start();

        // FFmpeg 로그 읽기
        readStream(process.getInputStream());

        int exitCode = process.waitFor();
        if (exitCode != 0) {
            log.error("[AudioConverter] FFmpeg 비정상 종료 exitCode={}", exitCode);
            // 변환 실패 에러 코드 사용
            throw new CustomException(ErrorCode.AUDIO_CONVERSION_FAILED);
        }
    }

    private void readStream(InputStream inputStream) {
        new Thread(() -> {
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(inputStream))) {
                String line;
                while ((line = reader.readLine()) != null) {
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