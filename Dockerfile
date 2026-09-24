# =========================================================================
# Multi-Stage Production Dockerfile (Security Hardened & Non-Root)
# =========================================================================

# --- STAGE 1: Builder (Cài đặt dependencies và build binary) ---
FROM python:3.11-slim-bookworm AS builder

WORKDIR /build

# Cài đặt công cụ build cần thiết
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy và cài đặt thư viện vào virtualenv độc lập
COPY requirements.txt .
RUN python -m venv /opt/venv && \
    /opt/venv/bin/pip install --no-cache-dir --upgrade pip setuptools wheel && \
    /opt/venv/bin/pip install --no-cache-dir -r requirements.txt


# --- STAGE 2: Final Runner (Bọc code an toàn, Non-Root User) ---
FROM python:3.11-slim-bookworm AS runner

# Metadata
LABEL maintainer="SymFlowAge Engineering Team"
LABEL security.non_root="true"

WORKDIR /app

# Cài đặt runtime libraries tối thiểu và dumb-init (PID 1 Signal Handling chống zombie process)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    dumb-init \
    curl \
    && rm -rf /var/lib/apt/lists/*

# BẢO MẬT: Tạo Non-Root User & Group (UID/GID = 10001)
# Ngăn chặn hoàn toàn kẻ tấn công chiếm quyền Root trên Host nếu container bị khai thác
RUN groupadd -g 10001 appgroup && \
    useradd -u 10001 -g appgroup -s /bin/bash -m -d /home/appuser appuser

# Copy virtualenv từ stage builder
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

# Copy mã nguồn ứng dụng và file cấu hình Gunicorn
COPY --chown=appuser:appgroup . /app

# Chuyển quyền thực thi sang User không có đặc quyền (Non-Root)
USER appuser:appgroup

# Mở port chạy ứng dụng
EXPOSE 8000

# Healthcheck định kỳ kiểm tra sức khỏe của các Worker
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8000/api/health || exit 1

# Sử dụng dumb-init để nhận và truyền SIGTERM / SIGINT chuẩn xác đến Gunicorn
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

# Chạy Gunicorn với cấu hình gunicorn.conf.py (Tự động quản lý số Worker tối ưu)
CMD ["gunicorn", "-c", "gunicorn.conf.py", "server:app"]
