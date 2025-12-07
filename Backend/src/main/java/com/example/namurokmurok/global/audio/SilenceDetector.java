package com.example.namurokmurok.global.audio;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import javax.sound.sampled.*;
import java.io.File;

@Slf4j
@Component
public class SilenceDetector {

    /**
     * SILENCE_DBFS_THRESHOLD
     * - RMS 기준으로 "소리 크기"가 이 값보다 작으면 무음으로 판단
     * - -42dBFS는 아동의 정상 발화(0.2~0.7초 짧은 말)는 통과시키고
     *   실제 무음/환경 잡음은 걸러낼 수 있는 현실적인 기준
     * - ※ 사람 목소리: -15~-35dBFS, 속삭임도 -38dBFS 정도
     *   무음/환경 잡음: -50dBFS 이하
     */
    private static final double SILENCE_DBFS_THRESHOLD = -42.0;

    /**
     *  MIN_DURATION_SEC
     * - 전체 녹음 길이가 이 값(0.8초) 미만일 경우 RMS 무음 판정을 하지 않음
     * - 이유:
     *   * 6~8세 아동의 정상적인 발화 길이는 매우 짧음(0.2~0.7초)
     *   * "응", "음", "몰라", "싫어" 같은 짧은 발화를 무음으로 오판하는 것을 방지
     * - 즉, 짧은 녹음은 "의도된 발화" 가능성이 더 높기 때문에 보호하는 로직
     */
    private static final double MIN_DURATION_SEC = 0.8; // 최소 음성 길이 기준

    /**
     * WAV 파일이 "대부분 무음"인지 판단
     * - 1차 무음 판단: 전체 RMS(dBFS) 기준
     * - 2차(FFmpeg)는 AudioValidationService에서 수행
     */
    public boolean isMostlySilent(File wavFile) {
        try (AudioInputStream ais = AudioSystem.getAudioInputStream(wavFile)) {
            AudioFormat format = ais.getFormat();

            if (format.getEncoding() != AudioFormat.Encoding.PCM_SIGNED) {
                throw new IllegalArgumentException("PCM_SIGNED WAV만 지원");
            }

            int bytesPerSample = format.getSampleSizeInBits() / 8;
            int channels = format.getChannels();
            float sampleRate = format.getSampleRate();

            byte[] buffer = new byte[4096];
            long totalSamples = 0;
            double sumSquares = 0.0;

            int bytesRead;
            while ((bytesRead = ais.read(buffer)) != -1) {
                // WAV PCM 데이터에서 샘플 추출 후 RMS(평균 제곱근) 계산
                for (int i = 0; i < bytesRead; i += bytesPerSample * channels) {
                    if (i + 1 >= bytesRead) break;

                    int low = buffer[i] & 0xff;
                    int high = buffer[i + 1]; // signed 유지
                    int sample = (high << 8) | low;

                    sumSquares += sample * sample;
                    totalSamples++;
                }
            }

            // 파일에 샘플이 없으면 무음으로 본다
            if (totalSamples == 0) return true;

            double rms = Math.sqrt(sumSquares / totalSamples);
            double dbfs = 20.0 * Math.log10(rms / 32768.0);

            double durationSec = totalSamples / sampleRate;

            log.info("[RMS] duration={}sec, dbfs={}", durationSec, dbfs);

            /**
             * 짧은 녹음(0.8초 미만)은 절대 무음으로 판단하지 않음
             * - 짧은 녹음 = 아동의 의도된 짧은 발화일 가능성이 높음
             * - 길이 기반 무음 필터를 적용하면 정상 발화를 무음으로 오판하는 문제가 생김
             */
            if (durationSec < MIN_DURATION_SEC) {
                return false;
            }

            /**
             * RMS 기반 무음 판정
             * - 전체 평균 음량이 -42dBFS 이하 → 말한 소리가 거의 없는 경우
             * - 실제 발화가 있을 경우 RMS는 보통 -35dBFS 이상이므로 통과
             */
            return dbfs < SILENCE_DBFS_THRESHOLD;

        } catch (Exception e) {
            log.error("[RMS] 무음 감지 실패", e);
            // 오류 발생 시 무음으로 처리하지 않음 (fail-open)
            return false;
        }
    }
}
