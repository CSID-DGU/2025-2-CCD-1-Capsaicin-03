package com.example.namurokmurok.domain.user.service;

import com.example.namurokmurok.domain.user.dto.ChildRequestDto;
import com.example.namurokmurok.domain.user.dto.ChildResponseDto;
import com.example.namurokmurok.domain.user.dto.UpdateChildRequestDto;
import com.example.namurokmurok.domain.user.entity.Child;
import com.example.namurokmurok.domain.user.entity.User;
import com.example.namurokmurok.domain.user.repository.ChildRepository;
import com.example.namurokmurok.domain.user.repository.UserRepository;
import com.example.namurokmurok.global.common.exception.CustomException;
import com.example.namurokmurok.global.common.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;


@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final ChildRepository childRepository;

    // user 저장(부모 최초 로그인시)
    @Transactional
    public User saveUser(String supabaseId, String email, String name) {
        return userRepository.findBySupabaseId(supabaseId)
                .orElseGet(() -> {
                    String finalName = (name != null && !name.isBlank())
                            ? name
                            : email.split("@")[0];

                    User newUser = User.builder()
                            .supabaseId(supabaseId)
                            .email(email)
                            .name(finalName)
                            .status(true)
                            .build();
                    return userRepository.save(newUser);
                });
    }

    // 아이 등록
    @Transactional
    public Long registerChild(String supabaseId, ChildRequestDto requestDto) {
        User user = userRepository.findBySupabaseId(supabaseId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        Boolean hasChild = childRepository.existsByUser(user);
        if(hasChild){
            throw new CustomException(ErrorCode.CHILD_ALREADY_EXISTS);  // 등록된 아이 예외처리
        }

        Child child = Child.builder()
                .name(requestDto.getName())
                .birthYear(requestDto.getBirthYear())
                .user(user)
                .build();

        childRepository.save(child);
        user.addChild(child);

        return child.getId();
    }

    // 아이 수정
    @Transactional
    public ChildResponseDto updateChild(String supabaseId, UpdateChildRequestDto requestDto) {
        User user = userRepository.findBySupabaseId(supabaseId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        Child child = childRepository.findByUserId(user.getId())
                .orElseThrow(() -> new CustomException(ErrorCode.CHILD_NOT_FOUND_FOR_USER));

        child.update(requestDto.getName(), requestDto.getBirth_year());

        return ChildResponseDto.builder()
                .id(child.getId())
                .name(child.getName())
                .birth_year(child.getBirthYear())
                .build();
    }

    // 아이 조회
    @Transactional(readOnly = true)
    public ChildResponseDto getChild(String supabaseId) {
        User user = userRepository.findBySupabaseId(supabaseId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        Child child = childRepository.findByUserId(user.getId())
                .orElseThrow(() -> new CustomException(ErrorCode.CHILD_NOT_FOUND_FOR_USER));

        return ChildResponseDto.builder()
                .id(child.getId())
                .name(child.getName())
                .birth_year(child.getBirthYear())
                .build();
    }

}
