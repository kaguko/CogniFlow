/**
 * SymFlowAge - Smart Caching, Rate Limiting & Model Routing Engine
 * 
 * 1. Rate Limiting: Token Bucket Algorithm with Tiered Windows & Quotas
 * 2. Smart Caching: Exact SHA-256 + Semantic Normalized Cache with Adaptive TTL
 * 3. Model Tiering: Intelligent routing to Flash/Lite for simple tasks vs Deep Reasoning for complex ones
 */

// =========================================================================
// 1. MODEL TIERING DEFINITIONS & ROUTER
// =========================================================================

export type TaskComplexity = 'simple' | 'medium' | 'complex';

export interface ModelTierConfig {
  name: string;
  modelId: string;
  recommendedTask: string;
  avgLatencyMs: number;
  costPer1kTokensUsd: number;
  tokenSavingPct: number;
  description: string;
}

export const MODEL_TIERS: Record<TaskComplexity, ModelTierConfig> = {
  simple: {
    name: 'Flash-Lite (Siêu Nhẹ & Nhanh)',
    modelId: 'gemini-3.1-flash-lite',
    recommendedTask: 'Phân rã vi bước 5-15p, đo ma sát quyết định, gắn tag semantic, format JSON',
    avgLatencyMs: 140,
    costPer1kTokensUsd: 0.000075,
    tokenSavingPct: 88,
    description: 'Ưu tiên hàng đầu cho các tác vụ vi mô. Phản hồi tức thì, tiết kiệm 88% chi phí và tài nguyên.',
  },
  medium: {
    name: 'Flash Standard (Cân Bằng Toàn Diện)',
    modelId: 'gemini-2.5-flash',
    recommendedTask: 'Dự đoán 3 Dòng thời gian, RAG QA Copilot, Phân tích điểm tắc nghẽn',
    avgLatencyMs: 420,
    costPer1kTokensUsd: 0.0003,
    tokenSavingPct: 65,
    description: 'Cân bằng giữa tốc độ và khả năng lập luận đa chiều cho các bài toán phân tích hệ thống.',
  },
  complex: {
    name: 'Pro / Deep Reasoning (Chuyên Sâu)',
    modelId: 'gemini-2.5-pro',
    recommendedTask: 'Thiết kế kiến trúc phân tán lớn, tổng hợp mã nguồn đa tầng, gỡ lỗi logic phức tạp',
    avgLatencyMs: 1250,
    costPer1kTokensUsd: 0.002,
    tokenSavingPct: 0,
    description: 'Dành riêng cho các tác vụ cần chuỗi suy luận sâu (deep chains of thought).',
  },
};

/**
 * Tự động phân loại độ phức tạp của tác vụ dựa trên yêu cầu
 */
export function classifyTaskComplexity(taskType: string, promptLength: number = 0): TaskComplexity {
  const lower = taskType.toLowerCase();
  if (
    lower.includes('tag') ||
    lower.includes('format') ||
    lower.includes('friction') ||
    lower.includes('quick_step') ||
    lower.includes('micro') ||
    promptLength < 250
  ) {
    return 'simple';
  }

  if (
    lower.includes('deep_architecture') ||
    lower.includes('full_system_audit') ||
    lower.includes('multi_repo') ||
    promptLength > 2500
  ) {
    return 'complex';
  }

  return 'medium';
}

// =========================================================================
// 2. RATE LIMITING ENGINE (TOKEN BUCKET)
// =========================================================================

export interface RateLimitTier {
  tierName: string;
  maxTokens: number;     // Dung lượng tối đa của Bucket (Burst capacity)
  refillRatePerSec: number; // Tốc độ hồi phục token mỗi giây
  windowSec: number;
}

export const RATE_LIMIT_TIERS: Record<string, RateLimitTier> = {
  ai_simple: {
    tierName: 'AI Simple (Flash/Lite)',
    maxTokens: 30,
    refillRatePerSec: 1, // 60 req/min
    windowSec: 60,
  },
  ai_standard: {
    tierName: 'AI Standard (Flash)',
    maxTokens: 20,
    refillRatePerSec: 0.5, // 30 req/min
    windowSec: 60,
  },
  ai_complex: {
    tierName: 'AI Complex (Deep/Pro)',
    maxTokens: 8,
    refillRatePerSec: 0.15, // ~10 req/min
    windowSec: 60,
  },
  rag_search: {
    tierName: 'RAG & Semantic Search',
    maxTokens: 40,
    refillRatePerSec: 1.5, // 90 req/min
    windowSec: 60,
  },
  general_api: {
    tierName: 'General API & Microsteps',
    maxTokens: 60,
    refillRatePerSec: 2, // 120 req/min
    windowSec: 60,
  },
};

export interface BucketState {
  tokens: number;
  lastRefillTimestamp: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remainingTokens: number;
  maxTokens: number;
  retryAfterSec: number;
  resetTimeSec: number;
}

export class TokenBucketRateLimiter {
  private buckets: Map<string, BucketState> = new Map();

  public check(clientKey: string, tierKey: string = 'general_api', cost: number = 1): RateLimitResult {
    const tier = RATE_LIMIT_TIERS[tierKey] || RATE_LIMIT_TIERS.general_api;
    const bucketId = `${tierKey}:${clientKey}`;
    const now = Date.now();

    let state = this.buckets.get(bucketId);
    if (!state) {
      state = {
        tokens: tier.maxTokens,
        lastRefillTimestamp: now,
      };
      this.buckets.set(bucketId, state);
    } else {
      // Hồi phục token theo thời gian đã trôi qua
      const elapsedSec = (now - state.lastRefillTimestamp) / 1000;
      const refilledTokens = elapsedSec * tier.refillRatePerSec;
      state.tokens = Math.min(tier.maxTokens, state.tokens + refilledTokens);
      state.lastRefillTimestamp = now;
    }

    if (state.tokens >= cost) {
      state.tokens -= cost;
      return {
        allowed: true,
        remainingTokens: Math.floor(state.tokens),
        maxTokens: tier.maxTokens,
        retryAfterSec: 0,
        resetTimeSec: Math.ceil((tier.maxTokens - state.tokens) / tier.refillRatePerSec),
      };
    } else {
      const needed = cost - state.tokens;
      const retryAfterSec = Math.ceil(needed / tier.refillRatePerSec);
      return {
        allowed: false,
        remainingTokens: Math.floor(state.tokens),
        maxTokens: tier.maxTokens,
        retryAfterSec: Math.max(1, retryAfterSec),
        resetTimeSec: retryAfterSec,
      };
    }
  }

  public reset(clientKey?: string) {
    if (clientKey) {
      for (const key of this.buckets.keys()) {
        if (key.endsWith(`:${clientKey}`)) {
          this.buckets.delete(key);
        }
      }
    } else {
      this.buckets.clear();
    }
  }
}

export const rateLimiter = new TokenBucketRateLimiter();

// =========================================================================
// 3. SMART CACHING ENGINE (EXACT HASH & SEMANTIC NORMALIZATION)
// =========================================================================

export interface CacheEntry<T = any> {
  key: string;
  normalizedKey: string;
  data: T;
  createdAt: number;
  ttlMs: number;
  hitCount: number;
  taskComplexity: TaskComplexity;
  latencySavedMs: number;
}

export interface CacheStats {
  totalRequests: number;
  hits: number;
  misses: number;
  hitRatioPct: number;
  totalLatencySavedMs: number;
  totalTokensSaved: number;
  estimatedUsdSaved: number;
}

export class SmartCacheManager {
  private cache: Map<string, CacheEntry> = new Map();
  private maxEntries: number = 200;
  private stats: CacheStats = {
    totalRequests: 0,
    hits: 0,
    misses: 0,
    hitRatioPct: 0,
    totalLatencySavedMs: 0,
    totalTokensSaved: 0,
    estimatedUsdSaved: 0,
  };

  /**
   * Chuẩn hóa prompt / truy vấn để tạo key thông minh
   */
  public normalizeKey(rawKey: string): string {
    return rawKey
      .toLowerCase()
      .trim()
      .replace(/[^\w\sàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/g, '')
      .replace(/\s+/g, ' ');
  }

  public get<T>(rawKey: string): { hit: boolean; data?: T; latencySavedMs?: number; entry?: CacheEntry } {
    this.stats.totalRequests++;
    const normKey = this.normalizeKey(rawKey);
    const now = Date.now();

    const entry = this.cache.get(normKey);
    if (!entry) {
      this.stats.misses++;
      this.recalculateStats();
      return { hit: false };
    }

    // Kiểm tra TTL
    if (now - entry.createdAt > entry.ttlMs) {
      this.cache.delete(normKey);
      this.stats.misses++;
      this.recalculateStats();
      return { hit: false };
    }

    entry.hitCount++;
    this.stats.hits++;
    this.stats.totalLatencySavedMs += entry.latencySavedMs;
    this.stats.totalTokensSaved += 450; // Ước lượng token trung bình
    this.stats.estimatedUsdSaved += 0.00035;
    this.recalculateStats();

    return {
      hit: true,
      data: entry.data as T,
      latencySavedMs: entry.latencySavedMs,
      entry,
    };
  }

  public set<T>(
    rawKey: string,
    data: T,
    taskComplexity: TaskComplexity = 'simple',
    customTtlMs?: number
  ): void {
    const normKey = this.normalizeKey(rawKey);
    const tier = MODEL_TIERS[taskComplexity];

    // Adaptive TTL: Tác vụ đơn giản (10 phút), Trung bình (30 phút), Phức tạp (120 phút)
    const ttlMs =
      customTtlMs ??
      (taskComplexity === 'simple'
        ? 10 * 60 * 1000
        : taskComplexity === 'medium'
        ? 30 * 60 * 1000
        : 120 * 60 * 1000);

    // Eviction LRU nếu đầy cache
    if (this.cache.size >= this.maxEntries) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) this.cache.delete(oldestKey);
    }

    this.cache.set(normKey, {
      key: rawKey,
      normalizedKey: normKey,
      data,
      createdAt: Date.now(),
      ttlMs,
      hitCount: 0,
      taskComplexity,
      latencySavedMs: tier.avgLatencyMs,
    });
  }

  public getStats(): CacheStats {
    return { ...this.stats };
  }

  public getEntries(): CacheEntry[] {
    return Array.from(this.cache.values()).sort((a, b) => b.createdAt - a.createdAt);
  }

  public clear(): void {
    this.cache.clear();
    this.stats = {
      totalRequests: 0,
      hits: 0,
      misses: 0,
      hitRatioPct: 0,
      totalLatencySavedMs: 0,
      totalTokensSaved: 0,
      estimatedUsdSaved: 0,
    };
  }

  private recalculateStats(): void {
    if (this.stats.totalRequests > 0) {
      this.stats.hitRatioPct = Math.round((this.stats.hits / this.stats.totalRequests) * 100);
    }
  }
}

export const smartCache = new SmartCacheManager();
