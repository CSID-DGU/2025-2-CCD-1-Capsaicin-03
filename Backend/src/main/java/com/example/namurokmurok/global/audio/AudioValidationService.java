package com.example.namurokmurok.global.audio;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.File;

@Slf4j
@Service
@RequiredArgsConstructor
public class AudioValidationService {

    private final SilenceDetector silenceDetector;          // 1차: RMS 기반 무음 감지 (짧은 발화 보호)
    private final FfmpegSilenceChecker ffmpegSilenceChecker; // 2차: FFmpeg 기반 무음 구간 비율 분석

    /**
     *  전체 무음 판단 로직
     *
     * - 6~8세 아동의 대화 특성(짧고 작은 발화) 때문에
     *   단순 RMS만으로 무음을 판단하면 정상 발화를 오판할 위험이 있음
     *
     * - 따라서 1차(RMS) + 2차(FFmpeg) 이중 검증을 수행하여
     *   “말하려는 의도 없는 입력(무음/잡음)”만 확실하게 차단하는 구조
     *
     * @return true  → 무음 또는 발화 없음으로 간주 (STT 요청 X)
     *         false → 발화 있음으로 간주 (STT 요청 진행)
     */
    public boolean isSilent(File wavFile) {

        /**
         * 1차 무음 검증 (RMS 기반)
         * - 녹음 길이와 평균 dBFS를 이용해 전체적인 음량이 매우 낮은 경우 무음으로 판단
         * - 아동의 짧은 발화는 보호되도록 MIN_DURATION_SEC 로직 적용됨
         * - 실제 무음(마이크만 누름), 주변 미세 잡음은 대부분 여기서 걸러짐
         */
        boolean rmsSilent = silenceDetector.isMostlySilent(wavFile);
        if (rmsSilent) {
            log.info("[AudioValidation] 1차 RMS에서 무음 판정");
            return true;
        }

        /**
         * 2차 무음 검증 (FFmpeg 기반)
         * - 1차에서 걸러지지 않은 특수 케이스(바스락, 짧은 잡음만 있는 파일 등)를 보정
         * - FFmpeg silencedetect를 활용해 전체 구간 중 무음 비율(예: 95% 이상)을 계산
         * - RMS 특성상 잡음이 '발화'처럼 인식되는 문제를 해결하는 보조 필터
         */
        boolean ffmpegSilent = ffmpegSilenceChecker.isMostlySilent(wavFile);
        if (ffmpegSilent) {
            log.info("[AudioValidation] 2차 FFmpeg에서 무음 판정");
            return true;
        }

        /**
         * 둘 다 통과하지 않으면 "발화가 있었다"고 판단
         * - STT 단계로 넘어감
         * - 아이의 정상 발화는 손실되지 않음
         */
        return false;
    }
}
