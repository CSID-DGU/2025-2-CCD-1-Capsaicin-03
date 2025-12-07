package com.example.namurokmurok.global.audio;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import javax.sound.sampled.*;
import java.io.*;

@Slf4j
@Component
public class FfmpegSilenceChecker {

    /**
     * SILENCE_PERCENT_THRESHOLD
     * - 전체 오디오 길이 중 "무음 비율"이 95% 이상이면 무음으로 간주
     *
     * - RMS(1차)에서 걸러지지 않는 특수 케이스를 보정하기 위한 기준
     *   예: 바스락/키보드 소리처럼 순간적으로만 잡음이 들어간 파일
     *
     * - 아이의 짧은 발화는 대부분 0.2~0.7초이기 때문에,
     *   전체 중 말한 구간이 5% 미만인 경우 = 실제 발화 없음으로 판단하는 데 적합
     */
    private static final double SILENCE_PERCENT_THRESHOLD = 0.95;

    /**
     * FFmpeg의 "silencedetect" 필터를 사용해 오디오 내 무음 구간 분석
     *
     * @return true  → 전체의 95% 이상이 무음으로 판단됨 (실제 발화 없음)
     *         false → 발화가 존재할 가능성이 높음
     */
    public boolean isMostlySilent(File wavFile) {

        try {
            /**
             * 🟦 FFmpeg 호출
             * - n=-40dB : 소리가 -40dBFS 이하이면 무음으로 간주
             * - d=0.25  : 0.25초 이상 지속될 때만 무음으로 인정
             *
             * 이유:
             * - 아이가 말한 소리(속삭임 포함)는 보통 -38dBFS 이상
             * - 환경 잡음/마찰음은 순간적으로 올라가지만 지속되지 않음
             * - "0.25초 이상 지속되는 작은 소리"만 무음으로 처리하여 정확도 향상
             */
            String[] cmd = {
                    "ffmpeg",
                    "-i", wavFile.getAbsolutePath(),
                    "-af", "silencedetect=n=-40dB:d=0.25",
                    "-f", "null", "-"
            };

            ProcessBuilder pb = new ProcessBuilder(cmd);
            pb.redirectErrorStream(true);
            Process process = pb.start();

            BufferedReader reader = new BufferedReader(
                    new InputStreamReader(process.getInputStream())
            );

            double totalSilence = 0.0;
            double lastSilenceStart = -1;

            /**
             * FFmpeg 로그 파싱
             * - silence_start : 무음 시작 지점
             * - silence_end   : 무음 종료 지점
             * - 두 지점의 차이(duration)를 누적하여 전체 무음 길이 계산
             */
            String line;
            while ((line = reader.readLine()) != null) {
                if (line.contains("silence_start:")) {
                    lastSilenceStart = parse(line, "silence_start:");
                } else if (line.contains("silence_end:")) {
                    double end = parse(line, "silence_end:");
                    if (lastSilenceStart >= 0) {
                        totalSilence += (end - lastSilenceStart);
                        lastSilenceStart = -1;
                    }
                }
            }

            process.waitFor();

            /**
             * 전체 오디오 길이 계산
             * - duration <= 0인 경우(파일 손상 등)는 무음으로 처리
             */
            double duration = getWavDuration(wavFile);
            if (duration <= 0) return true;

            double ratio = totalSilence / duration;

            log.info("[FFmpeg] duration={}, silence={}, ratio={}", duration, totalSilence, ratio);

            /**
             * 최종 무음 판단
             * - 전체의 95% 이상이 무음이면 실질적으로 발화가 없었던 것으로 판단
             * - 짧은 잡음(바스락), 순간적 충격음 등은 무음 구간으로 포함되지 않아
             *   '의도된 발화'가 아닌 경우를 정확히 걸러낼 수 있음
             */
            return ratio >= SILENCE_PERCENT_THRESHOLD;

        } catch (Exception e) {
            log.error("[FFmpeg] 분석 실패", e);
            // 분석 실패 시 무음으로 처리하지 않음 (fail-open)
            return false;
        }
    }

    /**
     * FFmpeg 로그에서 숫자 값을 추출하는 헬퍼
     */
    private double parse(String line, String key) {
        int idx = line.indexOf(key);
        String num = line.substring(idx + key.length()).trim().split(" ")[0];
        return Double.parseDouble(num);
    }

    /**
     * WAV 파일 전체 길이(초)를 계산
     */
    private double getWavDuration(File wavFile) throws Exception {
        try (AudioInputStream ais = AudioSystem.getAudioInputStream(wavFile)) {
            AudioFormat format = ais.getFormat();
            long frames = ais.getFrameLength();
            return frames / format.getFrameRate();
        }
    }
}
