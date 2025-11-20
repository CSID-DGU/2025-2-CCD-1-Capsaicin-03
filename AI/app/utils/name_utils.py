"""
이름 처리 유틸리티
"""

def extract_first_name(full_name: str) -> str:
    """
    전체 이름에서 이름만 추출 (성 제거)
    
    Args:
        full_name: 전체 이름 (예: "김현정", "이서연")
    
    Returns:
        이름 (예: "현정", "서연")
    
    Examples:
        >>> extract_first_name("김현정")
        "현정"
        >>> extract_first_name("현정")
        "현정"
        >>> extract_first_name("서")
        "서"
    """
    if not full_name or len(full_name) == 0:
        return full_name
    
    # 한글 이름은 보통 2-4자
    # 1자: 그대로 반환 (이미 이름만 있음)
    # 2자: 성 1자 + 이름 1자 → 마지막 1자 반환
    # 3자: 성 1자 + 이름 2자 → 마지막 2자 반환
    # 4자: 성 2자 + 이름 2자 또는 성 1자 + 이름 3자
    #      → 대부분 성 1자이므로 마지막 2-3자 반환
    
    full_name = full_name.strip()
    length = len(full_name)
    
    if length == 1:
        # 1자는 그대로
        return full_name
    elif length == 2:
        # 2자는 마지막 1자 (이름)
        return full_name[1:]
    elif length == 3:
        # 3자는 마지막 2자 (이름)
        return full_name[1:]
    else:
        # 4자 이상은 마지막 2자 (일반적인 이름)
        # 예: "남궁민수" → "민수", "황보지연" → "지연"
        return full_name[-2:]
