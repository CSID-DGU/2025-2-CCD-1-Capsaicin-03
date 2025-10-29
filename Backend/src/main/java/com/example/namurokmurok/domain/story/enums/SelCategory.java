package com.example.namurokmurok.domain.story.enums;

public enum SelCategory {
    SA("SA", "내 마음 살펴보기"), // 자기 인식
    SM("SM", "감정 다스리기"),   // 자기 관리
    SOA("SOA", "다른 사람 이해하기"),  // 사회적 인식
    RS("RS", "좋은 관계 맺기"),  // 관계 기술
    RDM("RDM", "올바른 선택하기"); // 책임 있는 의사 결정

    private final String code;
    private final String name;

    SelCategory(String code, String name) {
        this.code = code;
        this.name = name;
    }

    public String getCode() {
        return code;
    }

    public String getName() {
        return name;
    }
}

