export interface LockContentionBenchmark {
  lockMode: 'FOR UPDATE' | 'FOR NO KEY UPDATE';
  concurrentWorkers: number;
  deadlockRisk: 'High (Deadlock Risk on Foreign Keys)' | 'Zero Deadlock (Safe Concurrent Read/Write)';
  throughputQps: number;
  avgLockWaitTimeMs: number;
  explanation: string;
  sqlSnippet: string;
}

export interface ToastTaxBenchmark {
  approach: 'Raw JSONB Fetch (>8KB)' | 'Stored Generated Column';
  documentSizeKb: number;
  toastDecompressionCpuMs: number;
  memoryBufferReads: number;
  queryExecutionTimeMs: number;
  statisticsAccuracy: 'Low / Inaccurate (Planner cannot sample inside JSONB)' | 'High / 100% Exact Statistics';
  explanation: string;
  sqlSnippet: string;
}

export function simulateLockContention(
  mode: 'FOR UPDATE' | 'FOR NO KEY UPDATE',
  workers: number = 20
): LockContentionBenchmark {
  if (mode === 'FOR UPDATE') {
    return {
      lockMode: 'FOR UPDATE',
      concurrentWorkers: workers,
      deadlockRisk: 'High (Deadlock Risk on Foreign Keys)',
      throughputQps: Math.round(1800 / (1 + workers * 0.15)),
      avgLockWaitTimeMs: 14.5 * (workers / 10),
      explanation:
        'FOR UPDATE khóa toàn bộ hàng (Full Row Exclusive Lock) bao gồm cả các cột khóa chính/khóa ngoại. Khi các giao dịch song song chèn hoặc cập nhật bảng con có Foreign Key tham chiếu đến bảng này, PostgreSQL buộc phải chờ khóa giải phóng, dễ dẫn tới DEADLOCK trong hệ thống hàng đợi concurrent.',
      sqlSnippet: `-- Anti-Pattern trong Task Queue / Concurrent Updates:
BEGIN;
SELECT * FROM task_queue 
WHERE status = 'pending' 
ORDER BY id ASC 
LIMIT 1 
FOR UPDATE; -- ⚠️ Gây lock chéo foreign key & deadlocks

UPDATE task_queue SET status = 'processing', worker_id = 'worker-1' WHERE id = 123;
COMMIT;`,
    };
  }

  return {
    lockMode: 'FOR NO KEY UPDATE',
    concurrentWorkers: workers,
    deadlockRisk: 'Zero Deadlock (Safe Concurrent Read/Write)',
    throughputQps: Math.round(7500 * (1 + workers * 0.04)),
    avgLockWaitTimeMs: 0.18,
    explanation:
      'FOR NO KEY UPDATE chỉ khóa các cột dữ liệu thông thường, hoàn toàn KHÔNG khóa các cột Primary/Unique Key. Nhờ đó, các câu lệnh SELECT và các giao dịch kiểm tra Foreign Key chạy song song mà không bị chặn, triệt tiêu 100% nguy cơ Deadlock trong Task Queue!',
    sqlSnippet: `-- Giải pháp tối ưu chuẩn PostgreSQL High-Throughput Queue:
BEGIN;
SELECT * FROM task_queue 
WHERE status = 'pending' 
ORDER BY id ASC 
LIMIT 1 
FOR NO KEY UPDATE SKIP LOCKED; -- ✅ Không block FK, bỏ qua các dòng đang được worker khác xử lý!

UPDATE task_queue SET status = 'processing', worker_id = 'worker-1' WHERE id = 123;
COMMIT;`,
  };
}

export function simulateToastTax(
  approach: 'Raw JSONB Fetch (>8KB)' | 'Stored Generated Column',
  docSizeKb: number = 24
): ToastTaxBenchmark {
  if (approach === 'Raw JSONB Fetch (>8KB)') {
    return {
      approach: 'Raw JSONB Fetch (>8KB)',
      documentSizeKb: docSizeKb,
      toastDecompressionCpuMs: 8.4 + (docSizeKb / 10) * 2.8,
      memoryBufferReads: 48,
      queryExecutionTimeMs: 12.2 + (docSizeKb / 10) * 3.5,
      statisticsAccuracy: 'Low / Inaccurate (Planner cannot sample inside JSONB)',
      explanation:
        'Thuế TOAST (The TOAST Tax): Bất kỳ giá trị JSONB nào vượt quá ~2KB-8KB đều bị PostgreSQL nén và đẩy ra vùng nhớ ngoài luồng (TOAST table). Mỗi lần truy vấn lọc theo key trong JSONB, CPU phải tải từng chunk và giải nén (decompress) toàn bộ JSON document lớn, làm tăng đột biến CPU usage và độ trễ truy vấn!',
      sqlSnippet: `-- ⚠️ Chịu "Thuế TOAST": Phải giải nén toàn bộ tài liệu 24KB chỉ để so sánh 1 chuỗi priority
SELECT id, title FROM notes 
WHERE metadata->>'priority' = 'high'; -- Đọc TOAST chunk + Decompress trên từng row!`,
    };
  }

  return {
    approach: 'Stored Generated Column',
    documentSizeKb: docSizeKb,
    toastDecompressionCpuMs: 0.02,
    memoryBufferReads: 2,
    queryExecutionTimeMs: 0.12,
    statisticsAccuracy: 'High / 100% Exact Statistics',
    explanation:
      'Tránh Thuế TOAST bằng Stored Generated Columns: Trích xuất trường hay query (ví dụ: priority) ra thành cột vật lý được lưu ngay trong Main Tuple. PostgreSQL Planner thu thập đầy đủ thống kê phân bổ dữ liệu (Histogram Statistics) và đọc trực tiếp từ B-Tree index mà không bao giờ cần chạm vào bảng TOAST hay tốn CPU giải nén!',
    sqlSnippet: `-- ✅ Tránh 100% Thuế TOAST bằng Stored Generated Column:
ALTER TABLE notes 
ADD COLUMN extracted_priority text 
GENERATED ALWAYS AS (metadata->>'priority') STORED;

CREATE INDEX notes_generated_priority_idx ON notes (extracted_priority);

-- Truy vấn trực tiếp cột vật lý (Direct Tuple Scan, 0ms TOAST overhead):
SELECT id, title FROM notes WHERE extracted_priority = 'high';`,
  };
}
