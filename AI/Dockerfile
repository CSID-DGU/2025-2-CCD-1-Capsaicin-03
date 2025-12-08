FROM python:3.10-slim

# OS 패키지 설치
RUN apt-get update && apt-get install -y \
    build-essential \
    ffmpeg \
    libsndfile1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# worker=2
CMD ["gunicorn", "-k", "uvicorn.workers.UvicornWorker", "-w", "2", "--bind", "0.0.0.0:8000", "--timeout", "120", "app.main:app"]