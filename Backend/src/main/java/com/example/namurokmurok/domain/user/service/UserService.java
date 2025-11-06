package com.example.namurokmurok.domain.user.service;

import com.example.namurokmurok.domain.user.dto.ChildRequestDto;
import com.example.namurokmurok.domain.user.dto.ChildResponseDto;
import com.example.namurokmurok.domain.user.entity.Child;
import com.example.namurokmurok.domain.user.entity.User;
import com.example.namurokmurok.domain.user.repository.ChildRepository;
import com.example.namurokmurok.domain.user.repository.UserRepository;
import com.example.namurokmurok.global.exception.CustomException;
import com.example.namurokmurok.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;


@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final ChildRepository childRepository;

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

    @Transactional
    public ChildResponseDto registerChild(String supabaseId, ChildRequestDto requestDto) {
        User user = userRepository.findBySupabaseId(supabaseId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        Boolean hasChild = childRepository.existsByUser(user);
        if(hasChild){
            throw new CustomException(ErrorCode.CHILD_ALREADY_EXISTS);  // 등록된 아이 예외처리
        }

        Child child = Child.builder()
                .name(requestDto.getName())
                .birth(requestDto.getBirth())
                .user(user)
                .build();

        childRepository.save(child);
        user.addChild(child);

        return new ChildResponseDto(child.getUser().getId());
    }

}
