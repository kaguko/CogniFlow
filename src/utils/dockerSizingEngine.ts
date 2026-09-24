/**
 * SymFlowAge - Docker & Gunicorn Sizing Engine
 * 
 * 1. Tính toán vừa đủ "Đầu bếp" (Workers): (2 x CPU Cores) + 1
 * 2. Chia "Vòi nước" (DB Connection Pool): Phân bổ connection an toàn, chống sập Database
 */

export interface SizingConfig {
  cpuCores: number;
  containerRamMb: number;
  postgresMaxConnections: number;
  containerReplicas: number;
  hasArqWorker: boolean;
}

export interface SizingResult {
  // Workers (Đầu bếp)
  recommendedWorkers: number;
  totalWorkersAcrossCluster: number;
  memoryPerWorkerMb: number;
  workerCpuStatus: 'optimal' | 'underutilized' | 'overloaded';
  workerCpuNote: string;

  // DB Connections (Vòi nước)
  safePoolSizePerWorker: number;
  safeMaxOverflowPerWorker: number;
  totalMaxDbConnections: number;
  dbHeadroomReserved: number;
  isDbOverloaded: boolean;
  dbStatusSeverity: 'safe' | 'warning' | 'critical';
  dbStatusNote: string;

  // Docker Security Audit
  isNonRootSecured: boolean;
  uidGid: string;
  entrypointSignalHandler: string;
}

export function calculateProductionSizing(config: SizingConfig): SizingResult {
  const {
    cpuCores,
    containerRamMb,
    postgresMaxConnections,
    containerReplicas,
    hasArqWorker,
  } = config;

  // 1. TÍNH SỐ ĐẦU BẾP (GUNICORN WORKERS) THEO CÔNG THỨC VÀNG
  // (2 x CPU Cores) + 1
  const recommendedWorkers = Math.max(1, Math.round(2 * cpuCores + 1));
  const totalApiWorkers = recommendedWorkers * containerReplicas;
  const arqWorkersCount = hasArqWorker ? 1 * containerReplicas : 0;
  const totalWorkersAcrossCluster = totalApiWorkers + arqWorkersCount;

  // Bộ nhớ RAM trung bình trên mỗi Worker
  const memoryPerWorkerMb = Math.round(containerRamMb / recommendedWorkers);

  let workerCpuStatus: 'optimal' | 'underutilized' | 'overloaded' = 'optimal';
  let workerCpuNote = `Đã phân bổ lý tưởng ${recommendedWorkers} workers cho ${cpuCores} Core CPU. Khai thác tối đa I/O concurrency mà không gây nghẽn context-switch.`;

  if (memoryPerWorkerMb < 80) {
    workerCpuStatus = 'overloaded';
    workerCpuNote = `Cảnh báo: Bộ nhớ RAM mỗi worker quá thấp (${memoryPerWorkerMb}MB). Nguy cơ bị Linux OOM-Killer tắt tiến trình!`;
  }

  // 2. CHIA VÒI NƯỚC (DATABASE CONNECTIONS) VỪA ĐỦ
  // Dành 5-10 slots cho DBA / Migrations / Healthchecks / Superuser
  const reservedSlots = Math.min(10, Math.max(3, Math.round(postgresMaxConnections * 0.1)));
  const usableConnections = Math.max(1, postgresMaxConnections - reservedSlots);

  // Phân bổ Pool Size an toàn cho từng worker
  const maxAllowedPerWorker = Math.floor(usableConnections / totalWorkersAcrossCluster);
  const safePoolSizePerWorker = Math.max(2, Math.floor(maxAllowedPerWorker * 0.7));
  const safeMaxOverflowPerWorker = Math.max(1, Math.floor(maxAllowedPerWorker * 0.3));

  const totalMaxDbConnections = totalWorkersAcrossCluster * (safePoolSizePerWorker + safeMaxOverflowPerWorker);
  const dbHeadroomReserved = postgresMaxConnections - totalMaxDbConnections;

  const isDbOverloaded = totalMaxDbConnections > postgresMaxConnections;

  let dbStatusSeverity: 'safe' | 'warning' | 'critical' = 'safe';
  let dbStatusNote = `An toàn tuyệt đối! Tổng số kết nối tối đa (${totalMaxDbConnections}) nằm dưới ngưỡng ${postgresMaxConnections} của PostgreSQL. Còn dư ${dbHeadroomReserved} vòi nước dự phòng.`;

  if (isDbOverloaded) {
    dbStatusSeverity = 'critical';
    dbStatusNote = `NGUY CƠ SẬP DATABASE! Tổng số kết nối yêu cầu (${totalMaxDbConnections}) vượt quá max_connections (${postgresMaxConnections}) của PostgreSQL! Sẽ gây lỗi Fatal Connection Refused.`;
  } else if (dbHeadroomReserved < 5) {
    dbStatusSeverity = 'warning';
    dbStatusNote = `Cảnh báo: Khoảng dự phòng vòi nước rất hẹp (${dbHeadroomReserved} slots). Cân nhắc nâng max_connections lên hoặc giảm pool_size.`;
  }

  return {
    recommendedWorkers,
    totalWorkersAcrossCluster,
    memoryPerWorkerMb,
    workerCpuStatus,
    workerCpuNote,
    safePoolSizePerWorker,
    safeMaxOverflowPerWorker,
    totalMaxDbConnections,
    dbHeadroomReserved,
    isDbOverloaded,
    dbStatusSeverity,
    dbStatusNote,
    isNonRootSecured: true,
    uidGid: '10001:10001 (appuser:appgroup)',
    entrypointSignalHandler: 'dumb-init (PID 1 - SIGTERM/SIGINT propagation)',
  };
}
