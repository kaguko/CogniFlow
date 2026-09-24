# =========================================================================
# Gunicorn Configuration File (gunicorn.conf.py)
# Tự động tính toán số lượng Workers ("Đầu bếp") và quản lý Uvicorn Workers
# =========================================================================
import multiprocessing
import os

# 1. TÍNH TOÁN VỪA ĐỦ ĐẦU BẾP (WORKERS):
# Công thức vàng: (2 x CPU Cores) + 1
# Tránh tạo quá nhiều worker làm nghẽn CPU do Context-Switching
cpu_cores = os.cpu_count() or 1
workers_calculated = (2 * cpu_cores) + 1

# Có thể override qua biến môi trường WEB_CONCURRENCY nếu chạy trong Container có giới hạn CPU Quota
workers = int(os.getenv("WEB_CONCURRENCY", workers_calculated))

# Worker class: Dùng UvicornWorker cho kiến trúc Async FastAPI / Starlette
worker_class = "uvicorn.workers.UvicornWorker"

# 2. BINDING & NETWORKING
bind = os.getenv("BIND", "0.0.0.0:8000")
backlog = 2048 # Queue connection backlog

# 3. WORKER LIFECYCLE & BẢO VỆ BỘ NHỚ
# Tự động restart worker sau 10,000 - 12,000 requests để triệt tiêu hiện tượng rò rỉ RAM (Memory Leak)
max_requests = int(os.getenv("MAX_REQUESTS", 10000))
max_requests_jitter = int(os.getenv("MAX_REQUESTS_JITTER", 2000))

# Graceful Timeout: Cho phép worker hoàn thành nốt request đang chạy trong 30s khi nhận SIGTERM
timeout = int(os.getenv("TIMEOUT", 30))
graceful_timeout = int(os.getenv("GRACEFUL_TIMEOUT", 30))
keepalive = 5

# 4. PRELOAD APP (Tối ưu RAM bằng Copy-on-Write)
preload_app = True

# 5. LOGGING CHUẨN CONTAINER (STDOUT / STDERR)
accesslog = "-"
errorlog = "-"
loglevel = os.getenv("LOG_LEVEL", "info")
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s" (%(L)ss)'
