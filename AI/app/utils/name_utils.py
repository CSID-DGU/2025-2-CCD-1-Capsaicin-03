"""
이름 처리 유틸리티
"""

def has_jongseong(char: str) -> bool:
    """
    한글 문자의 받침(종성) 여부 확인
    
    Args:
        char: 한글 문자 1개
    
    Returns:
        받침이 있으면 True, 없으면 False
    
    Examples:
        >>> has_jongseong("정")
        True
        >>> has_jongseong("나")
        False
    """
    if not char or len(char) != 1:
        return False
    
    # 한글 유니코드 범위: 0xAC00 ~ 0xD7A3
    code = ord(char)
    if code < 0xAC00 or code > 0xD7A3:
        return False
    
    # 종성 계산: (code - 0xAC00) % 28
    # 0이면 받침 없음, 1-27이면 받침 있음
    jongseong = (code - 0xAC00) % 28
    return jongseong != 0


def get_vocative_particle(name: str) -> str:
    """
    이름 뒤에 붙을 호격 조사 반환 ("아" 또는 "야")
    
    Args:
        name: 아이 이름
    
    Returns:
        "아" (받침 있음) 또는 "야" (받침 없음)
    
    Examples:
        >>> get_vocative_particle("현정")
        "아"
        >>> get_vocative_particle("나라")
        "야"
        >>> get_vocative_particle("민수")
        "야"
    """
    if not name:
        return "아"
    
    # 마지막 글자의 받침 확인
    last_char = name[-1]
    return "아" if has_jongseong(last_char) else "야"


def format_name_with_vocative(name: str) -> str:
    """
    이름에 적절한 호격 조사를 붙여서 반환
    
    Args:
        name: 아이 이름
    
    Returns:
        "이름+호격조사" (예: "현정아", "나라야")
    
    Examples:
        >>> format_name_with_vocative("현정")
        "현정아"
        >>> format_name_with_vocative("나라")
        "나라야"
    """
    return f"{name}{get_vocative_particle(name)}"


def get_subject_particle(name: str) -> str:
    """
    이름 뒤에 붙을 주격 조사 반환 ("이" 또는 "가")
    
    Args:
        name: 이름
    
    Returns:
        "이" (받침 있음) 또는 "가" (받침 없음)
    
    Examples:
        >>> get_subject_particle("콩쥐")
        "가"
        >>> get_subject_particle("팥쥐")
        "가"
    """
    if not name:
        return "이"
    
    last_char = name[-1]
    return "이" if has_jongseong(last_char) else "가"


def get_topic_particle(name: str) -> str:
    """
    이름 뒤에 붙을 보조사 반환 ("은" 또는 "는")
    
    Args:
        name: 이름
    
    Returns:
        "은" (받침 있음) 또는 "는" (받침 없음)
    
    Examples:
        >>> get_topic_particle("콩쥐")
        "는"
        >>> get_topic_particle("팥쥐")
        "는"
    """
    if not name:
        return "은"
    
    last_char = name[-1]
    return "은" if has_jongseong(last_char) else "는"


def format_name_with_subject(name: str) -> str:
    """
    이름에 적절한 주격 조사를 붙여서 반환
    
    Args:
        name: 이름
    
    Returns:
        "이름+주격조사" (예: "콩쥐가", "나라가")
    
    Examples:
        >>> format_name_with_subject("콩쥐")
        "콩쥐가"
        >>> format_name_with_subject("나라")
        "나라가"
    """
    return f"{name}{get_subject_particle(name)}"


def format_name_with_topic(name: str) -> str:
    """
    이름에 적절한 보조사를 붙여서 반환
    
    Args:
        name: 이름
    
    Returns:
        "이름+보조사" (예: "콩쥐는", "나라는")
    
    Examples:
        >>> format_name_with_topic("콩쥐")
        "콩쥐는"
        >>> format_name_with_topic("나라")
        "나라는"
    """
    return f"{name}{get_topic_particle(name)}"


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
