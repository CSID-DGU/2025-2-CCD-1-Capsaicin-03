package com.example.namurokmurok.global.audio;

import com.example.namurokmurok.global.common.exception.CustomException;
import com.example.namurokmurok.global.common.exception.ErrorCode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.io.*;
import java.nio.file.Files;
import java.util.List;

@Slf4j
@Component
public class AudioConverter {

    private static final String FFMPEG_PATH = "ffmpeg";

    /**
     * 모든 주요 오디오(webm, wav, mp3, m4a, caf, aac) → wav 변환
     */
    public File convertWebmToWav(MultipartFile audioFile) {
        File inputAudio = null;
        File outputWav = null;

        try {
            // 1) 확장자 또는 MIME 기반 확장자 추론
            String ext = resolveExtension(audioFile);
            log.info("[AudioConverter] 감지된 오디오 확장자: {}", ext);

            // 2) 입력 파일 생성
            inputAudio = File.createTempFile("input-", "." + ext);
            audioFile.transferTo(inputAudio);

            // 3) 출력 wav 파일 생성
            outputWav = File.createTempFile("output-", ".wav");

            // 4) FFmpeg 변환 실행
            executeFfmpeg(inputAudio, outputWav);

            log.info("[AudioConverter] 변환 성공: {} → {} (size={} bytes)",
                    ext, outputWav.getAbsolutePath(), outputWav.length());

            return outputWav;

        } catch (IOException e) {
            cleanupFile(outputWav);
            log.error("[AudioConverter] 파일 I/O 오류", e);
            throw new CustomException(ErrorCode.FILE_SYSTEM_ERROR, e);

        } catch (InterruptedException e) {
            cleanupFile(outputWav);
            Thread.currentThread().interrupt();
            log.error("[AudioConverter] FFmpeg 프로세스 중단", e);
            throw new CustomException(ErrorCode.INTERNAL_SERVER_ERROR, e);

        } catch (CustomException e) {
            cleanupFile(outputWav);
            throw e;

        } catch (Exception e) {
            cleanupFile(outputWav);
            log.error("[AudioConverter] 알 수 없는 변환 오류", e);
            throw new CustomException(ErrorCode.AUDIO_CONVERSION_FAILED, e);

        } finally {
            cleanupFile(inputAudio);
        }
    }

    /**
     * 확장자 또는 MIME 타입 기반으로 실제 확장자 추론
     */
    private String resolveExtension(MultipartFile file) {
        String filename = file.getOriginalFilename();

        // 1) 확장자 존재 시 그대로 사용
        if (filename != null && filename.contains(".")) {
            return filename.substring(filename.lastIndexOf('.') + 1)
                    .toLowerCase();
        }

        // 2) 확장자가 없으면 MIME 기반 추론
        String mime = file.getContentType();
        log.info("[AudioConverter] MIME 타입 감지: {}", mime);

        if (mime == null) {
            throw new CustomException(ErrorCode.UNSUPPORTED_AUDIO_FORMAT);
        }

        return switch (mime) {
            case "audio/x-caf" -> "caf";   // iPad 기본 녹음 형식
            case "audio/mp4", "audio/m4a" -> "m4a";
            case "audio/aac" -> "aac";
            case "audio/wav", "audio/wave" -> "wav";
            case "audio/webm" -> "webm";
            case "audio/mpeg" -> "mp3";
            default -> throw new CustomException(ErrorCode.UNSUPPORTED_AUDIO_FORMAT);
        };
    }

    /**
     * FFmpeg 변환 실행 (16kHz mono WAV)
     */
    private void executeFfmpeg(File input, File output) throws IOException, InterruptedException {
        String[] command = {
                FFMPEG_PATH, "-y",
                "-i", input.getAbsolutePath(),
                "-ac", "1",            // mono
                "-ar", "16000",        // 16kHz
                output.getAbsolutePath()
        };

        ProcessBuilder pb = new ProcessBuilder(command);
        pb.redirectErrorStream(true);

        Process process = pb.start();
        readStream(process.getInputStream());

        int exitCode = process.waitFor();
        if (exitCode != 0) {
            log.error("[AudioConverter] FFmpeg 종료 코드 오류: {}", exitCode);
            throw new CustomException(ErrorCode.AUDIO_CONVERSION_FAILED);
        }
    }

    private void readStream(InputStream inputStream) {
        new Thread(() -> {
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(inputStream))) {
                while (reader.readLine() != null) {
                    // FFmpeg 로그 무시 (필요시 디버깅 가능)
                }
            } catch (IOException e) {
                log.error("[AudioConverter] FFmpeg 로그 읽기 실패", e);
            }
        }).start();
    }

    private void cleanupFile(File file) {
        if (file != null && file.exists()) {
            try {
                Files.deleteIfExists(file.toPath());
            } catch (IOException e) {
                log.warn("[AudioConverter] 임시 파일 삭제 실패: {}", file.getAbsolutePath());
            }
        }
    }
}
