export interface JsonbQueryAnalysisResult {
  querySql: string;
  strategyUsed:
    | 'GIN (jsonb_ops)'
    | 'GIN (jsonb_path_ops)'
    | 'Expression B-Tree'
    | 'Partial Index'
    | 'None (Sequential Scan)';
  isAntiPattern: boolean;
  antiPatternWarning?: string;
  estimatedCost: {
    indexScanType: 'Index Scan' | 'Bitmap Heap Scan' | 'Sequential Scan (Full Table Scan)';
    storageOverheadRelative: string;
    executionTimeMs: number;
    bufferReads: number;
  };
  recommendation: string;
}

/**
 * Simulates and analyzes PostgreSQL execution plan for JSONB query strategies.
 * Evaluates whether a query leverages GIN (jsonb_ops / jsonb_path_ops), Expression B-Tree,
 * Partial Index, or falls into the Anti-Pattern (Seq Scan).
 */
export function analyzeJsonbQueryPlan(
  operator: '@>' | '?' | '->>' | '->' | 'BETWEEN',
  indexType: 'gin_ops' | 'gin_path_ops' | 'expression_btree' | 'partial_index' | 'none',
  hasPartialCondition: boolean = false,
  sampleKey: string = 'priority',
  sampleValue: string = 'high'
): JsonbQueryAnalysisResult {
  // Case 1: Anti-Pattern Check (GIN Index created, but querying with ->> operator)
  if (
    (indexType === 'gin_ops' || indexType === 'gin_path_ops') &&
    (operator === '->>' || operator === '->')
  ) {
    return {
      querySql: `SELECT * FROM notes WHERE metadata->>'${sampleKey}' = '${sampleValue}';`,
      strategyUsed: 'None (Sequential Scan)',
      isAntiPattern: true,
      antiPatternWarning:
        'ANTI-PATTERN CẢNH BÁO: Bạn đã tạo GIN index nhưng lại dùng toán tử ->> để truy vấn. PostgreSQL không thể áp dụng GIN index cho biểu thức trích xuất chuỗi ->>, dẫn đến bỏ qua Index và thực hiện Sequential Scan (Full Table Scan) làm chậm toàn bộ hệ thống!',
      estimatedCost: {
        indexScanType: 'Sequential Scan (Full Table Scan)',
        storageOverheadRelative: indexType === 'gin_ops' ? '50-100% Table Size' : '15-25% Table Size',
        executionTimeMs: 42.8,
        bufferReads: 1450,
      },
      recommendation: `Giải pháp: Thay vì dùng "metadata->>'${sampleKey}' = '${sampleValue}'", hãy chuyển sang toán tử bao hàm "metadata @> '{"${sampleKey}": "${sampleValue}"}'::jsonb" để kích hoạt GIN Index, hoặc tạo một Expression B-Tree index trên (metadata->>'${sampleKey}').`,
    };
  }

  // Case 2: Expression B-Tree with ->> operator
  if (indexType === 'expression_btree' && (operator === '->>' || operator === 'BETWEEN')) {
    return {
      querySql: `SELECT * FROM notes WHERE metadata->>'${sampleKey}' = '${sampleValue}';`,
      strategyUsed: 'Expression B-Tree',
      isAntiPattern: false,
      estimatedCost: {
        indexScanType: 'Index Scan',
        storageOverheadRelative: 'Rất nhỏ (~5% Table Size, chỉ lưu 1 scalar key)',
        executionTimeMs: 0.14,
        bufferReads: 4,
      },
      recommendation: `Tối ưu hoàn hảo: Expression B-Tree Index trên (metadata->>'${sampleKey}') được kích hoạt trực tiếp với chi phí thấp nhất cho các phép so sánh =, <, >, BETWEEN, IN.`,
    };
  }

  // Case 3: GIN (jsonb_path_ops) with @> operator
  if (indexType === 'gin_path_ops' && operator === '@>') {
    return {
      querySql: `SELECT * FROM notes WHERE metadata @> '{"${sampleKey}": "${sampleValue}"}'::jsonb;`,
      strategyUsed: 'GIN (jsonb_path_ops)',
      isAntiPattern: false,
      estimatedCost: {
        indexScanType: 'Bitmap Heap Scan',
        storageOverheadRelative: 'Nhỏ (Chỉ 1/3 - 1/4 so với jsonb_ops)',
        executionTimeMs: 0.28,
        bufferReads: 12,
      },
      recommendation:
        'Tối ưu đỉnh cao: GIN jsonb_path_ops băm toàn bộ đường dẫn JSON thành 32-bit hash, mang lại tốc độ truy vấn bao hàm (@>) siêu tốc và tiết kiệm 70% dung lượng đĩa so với GIN mặc định.',
    };
  }

  // Case 4: GIN (jsonb_ops) with key existence ? or containment @>
  if (indexType === 'gin_ops') {
    const query =
      operator === '?'
        ? `SELECT * FROM notes WHERE metadata ? '${sampleKey}';`
        : `SELECT * FROM notes WHERE metadata @> '{"${sampleKey}": "${sampleValue}"}'::jsonb;`;
    return {
      querySql: query,
      strategyUsed: 'GIN (jsonb_ops)',
      isAntiPattern: false,
      estimatedCost: {
        indexScanType: 'Bitmap Heap Scan',
        storageOverheadRelative: 'Rất lớn (50-100% Table Size)',
        executionTimeMs: 0.45,
        bufferReads: 28,
      },
      recommendation:
        'Linh hoạt tối đa: GIN jsonb_ops lập chỉ mục cho mọi key và value, hỗ trợ đầy đủ toán tử @>, ?, ?|, ?& khi bạn không biết trước cấu trúc schema.',
    };
  }

  // Case 5: Partial Index
  if (indexType === 'partial_index' || hasPartialCondition) {
    return {
      querySql: `SELECT * FROM notes WHERE is_active = true AND metadata @> '{"${sampleKey}": "${sampleValue}"}'::jsonb;`,
      strategyUsed: 'Partial Index',
      isAntiPattern: false,
      estimatedCost: {
        indexScanType: 'Bitmap Heap Scan',
        storageOverheadRelative: 'Cực kỳ nhỏ (< 2% Table Size, chỉ lọc bản ghi active)',
        executionTimeMs: 0.09,
        bufferReads: 3,
      },
      recommendation:
        'Tối ưu dung lượng tuyệt đối: Partial Index chỉ lập chỉ mục cho các bản ghi thỏa mãn điều kiện tĩnh (is_active = true), loại bỏ hoàn toàn chi phí lưu trữ cho dữ liệu rác/lưu trữ cũ.',
    };
  }

  // Default Fallback
  return {
    querySql: `SELECT * FROM notes WHERE metadata->>'${sampleKey}' = '${sampleValue}';`,
    strategyUsed: 'None (Sequential Scan)',
    isAntiPattern: false,
    estimatedCost: {
      indexScanType: 'Sequential Scan (Full Table Scan)',
      storageOverheadRelative: '0% (Không có Index)',
      executionTimeMs: 38.5,
      bufferReads: 1200,
    },
    recommendation:
      'Chưa có Index phù hợp: Cần lập chỉ mục theo 1 trong 4 chiến lược để tăng tốc truy vấn.',
  };
}
