/**
 * SymFlowAge - Trụ cột 4: Cache-aside & Tombstone Invalidation Engine
 * 
 * Ngăn chặn triệt để Async Race-Condition và Stale Data Leak giữa luồng đọc chậm (Slow Reader)
 * và luồng ghi đồng thời (Concurrent Writer) trong hệ thống phân tán Redis + PostgreSQL.
 */

export interface CacheEntry<T = any> {
  key: string;
  data: T;
  version: number;
  cachedAt: number;
  expiresAt: number;
}

export interface TombstoneRecord {
  key: string;
  setAt: number;
  expiresAt: number;
  reason: string;
}

export interface RaceConditionSimulationEvent {
  step: number;
  timestampOffsetMs: number;
  actor: 'FastAPI Worker (UC)' | 'PostgreSQL DB' | 'Redis Cache';
  flow: 'Flow 1: Read-through' | 'Flow 2: Invalidation';
  action: string;
  stateChange: string;
  isBlockedByTombstone?: boolean;
}

export interface SimulationResult {
  hasTombstoneProtection: boolean;
  finalCacheValue: string;
  finalDbValue: string;
  isCacheStale: boolean;
  events: RaceConditionSimulationEvent[];
  conclusion: string;
}

export class TombstoneCacheManager {
  private cacheStore = new Map<string, CacheEntry>();
  private tombstoneStore = new Map<string, TombstoneRecord>();
  private stats = {
    hits: 0,
    misses: 0,
    tombstoneBlocks: 0,
    invalidations: 0,
  };

  /**
   * Flow 1: Lấy dữ liệu từ Cache (Read-Through)
   */
  public async get<T>(key: string): Promise<T | null> {
    const now = Date.now();
    const entry = this.cacheStore.get(key);

    if (!entry || entry.expiresAt <= now) {
      if (entry) this.cacheStore.delete(key);
      this.stats.misses++;
      return null;
    }

    this.stats.hits++;
    return entry.data as T;
  }

  /**
   * Flow 1: Insert best-effort lên Cache sau khi đọc từ DB
   * Kiểm tra điều kiện: Nếu Tombstone đang tồn tại -> HỦY/BỎ QUA thao tác ghi lên Cache!
   */
  public async setBestEffort<T>(
    key: string,
    data: T,
    ttlSeconds = 60,
    enforceTombstone = true
  ): Promise<{ success: boolean; blockedByTombstone: boolean }> {
    const now = Date.now();

    // Kiểm tra Tombstone còn hiệu lực
    const activeTombstone = this.tombstoneStore.get(key);
    if (enforceTombstone && activeTombstone && activeTombstone.expiresAt > now) {
      this.stats.tombstoneBlocks++;
      return { success: false, blockedByTombstone: true };
    }

    this.cacheStore.set(key, {
      key,
      data,
      version: Date.now(),
      cachedAt: now,
      expiresAt: now + ttlSeconds * 1000,
    });

    return { success: true, blockedByTombstone: false };
  }

  /**
   * Flow 2: Invalidation Flow
   * 1. SET Tombstone (TTL)
   * 2. DELETE Cache Entry
   */
  public async invalidateWithTombstone(
    key: string,
    tombstoneTtlSeconds = 10,
    reason = 'Database record updated'
  ): Promise<void> {
    const now = Date.now();
    this.stats.invalidations++;

    // 1. Đặt Bia mộ (Tombstone) với thời gian TTL bảo vệ (5-15 giây)
    this.tombstoneStore.set(key, {
      key,
      setAt: now,
      expiresAt: now + tombstoneTtlSeconds * 1000,
      reason,
    });

    // 2. Xóa Cache Entry hiện tại
    this.cacheStore.delete(key);
  }

  /**
   * Xóa cache đơn thuần (Không dùng Tombstone - Dễ bị Race Condition)
   */
  public async invalidateNaive(key: string): Promise<void> {
    this.stats.invalidations++;
    this.cacheStore.delete(key);
    this.tombstoneStore.delete(key);
  }

  public getStats() {
    return { ...this.stats };
  }

  public isTombstoneActive(key: string): boolean {
    const ts = this.tombstoneStore.get(key);
    return !!ts && ts.expiresAt > Date.now();
  }

  /**
   * Mô phỏng kịch bản Bất đồng bộ (Async Race Condition Simulation)
   * Đối sánh kịch bản: Có Tombstone vs Không có Tombstone
   */
  public simulateRaceCondition(withTombstone: boolean): SimulationResult {
    const events: RaceConditionSimulationEvent[] = [];
    const key = 'user:goal:101';
    const originalValue = 'Mục tiêu: Hoàn thành Refactor Q1 (v1)';
    const updatedValue = 'Mục tiêu: Deploy Microservices Production (v2)';

    let dbState = originalValue;
    let cacheState: string | null = null;
    let finalCacheValue = '';

    // Thời điểm T=0ms: Luồng 1 (Slow Reader) bắt đầu
    events.push({
      step: 1,
      timestampOffsetMs: 0,
      actor: 'FastAPI Worker (UC)',
      flow: 'Flow 1: Read-through',
      action: `Gọi get("${key}") từ Redis Cache`,
      stateChange: 'Cache Miss (chưa có trong cache)',
    });

    // Thời điểm T=10ms: Luồng 1 query DB (bắt đầu tiến trình I/O đọc DB)
    events.push({
      step: 2,
      timestampOffsetMs: 10,
      actor: 'PostgreSQL DB',
      flow: 'Flow 1: Read-through',
      action: `Thực hiện SELECT * FROM goals WHERE id=101`,
      stateChange: `DB trả về dữ liệu cũ: "${originalValue}" (Luồng 1 lưu vào biến bộ nhớ local)`,
    });

    // Thời điểm T=30ms: BẤT NGỜ Luồng 2 (Fast Writer) UPDATE vào DB!
    dbState = updatedValue;
    events.push({
      step: 3,
      timestampOffsetMs: 30,
      actor: 'PostgreSQL DB',
      flow: 'Flow 2: Invalidation',
      action: `Luồng 2 gọi UPDATE goals SET title="${updatedValue}"`,
      stateChange: `PostgreSQL cập nhật thành công giá trị mới: "${updatedValue}"`,
    });

    if (withTombstone) {
      // Thời điểm T=35ms: Luồng 2 SET Tombstone lên Redis
      events.push({
        step: 4,
        timestampOffsetMs: 35,
        actor: 'Redis Cache',
        flow: 'Flow 2: Invalidation',
        action: `SET tombstone:${key} EX 10 (Đặt Bia Mộ TTL=10s)`,
        stateChange: `Tombstone kích hoạt! Redis từ chối mọi thao tác ghi dữ liệu cũ trong 10s.`,
      });

      // Thời điểm T=40ms: Luồng 2 DELETE Cache Entry
      cacheState = null;
      events.push({
        step: 5,
        timestampOffsetMs: 40,
        actor: 'Redis Cache',
        flow: 'Flow 2: Invalidation',
        action: `DELETE ${key}`,
        stateChange: `Cache Entry cũ đã bị dọn dẹp hoàn toàn.`,
      });

      // Thời điểm T=120ms: Luồng 1 (chậm trễ mạng) mới hoàn thành và cố gắng ghi đè dữ liệu cũ lên Redis!
      events.push({
        step: 6,
        timestampOffsetMs: 120,
        actor: 'FastAPI Worker (UC)',
        flow: 'Flow 1: Read-through',
        action: `Luồng 1 cố gắng gọi SET ${key}="${originalValue}" (Insert best-effort)`,
        stateChange: `🛡️ BỊ TOMBSTONE CHẶN LẠI! Redis phát hiện Bia mộ còn hiệu lực -> HỦY THAO TÁC GHI!`,
        isBlockedByTombstone: true,
      });

      finalCacheValue = 'Trống (Cache Miss - Yêu cầu lần đọc tiếp theo lấy trực tiếp v2 từ DB)';
    } else {
      // Kịch bản KHÔNG CÓ Tombstone (Xóa chay)
      events.push({
        step: 4,
        timestampOffsetMs: 35,
        actor: 'Redis Cache',
        flow: 'Flow 2: Invalidation',
        action: `DELETE ${key} (Xóa chay thông thường, không có Tombstone)`,
        stateChange: `Cache Entry bị xóa. Không có cơ chế bảo vệ.`,
      });

      // Thời điểm T=120ms: Luồng 1 ghi đè thành công dữ liệu cũ lên Redis!
      cacheState = originalValue;
      events.push({
        step: 5,
        timestampOffsetMs: 120,
        actor: 'Redis Cache',
        flow: 'Flow 1: Read-through',
        action: `Luồng 1 ghi đè: SET ${key}="${originalValue}" (Dữ liệu cũ thời điểm T=10ms)`,
        stateChange: `❌ THẢM HỌA RACE CONDITION: Redis bị nhiễm dữ liệu cũ v1 ("${originalValue}") trong khi DB đã là v2 ("${updatedValue}")!`,
        isBlockedByTombstone: false,
      });

      finalCacheValue = originalValue;
    }

    const isCacheStale = !withTombstone;

    return {
      hasTombstoneProtection: withTombstone,
      finalCacheValue,
      finalDbValue: dbState,
      isCacheStale,
      events,
      conclusion: withTombstone
        ? '✅ BẢO TOÀN TÍNH NHẤT QUÁN 100%: Tombstone đã chặn đứng luồng đọc chậm ghi đè dữ liệu cũ lên Redis. Lần đọc tiếp theo của người dùng sẽ lấy trực tiếp bản ghi mới nhất từ DB.'
        : '❌ LỖ HỔNG DỮ LIỆU RÁC (STALE CACHE LEAK): Redis lưu dữ liệu cũ v1 trong khi DB đã cập nhật v2. Người dùng sẽ liên tục nhìn thấy dữ liệu sai lệch cho đến khi TTL hết hạn!',
    };
  }
}

export const tombstoneCacheEngine = new TombstoneCacheManager();
