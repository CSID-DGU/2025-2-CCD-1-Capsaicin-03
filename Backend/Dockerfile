# 1. JDK 17 환경 이미지 사용
FROM eclipse-temurin:17-jdk-jammy

# 2. JAR 파일 복사
ARG JAR_FILE=build/libs/*.jar
COPY ${JAR_FILE} app.jar

# 3. 서버 실행
ENTRYPOINT ["java", "-jar", "/app.jar"]
