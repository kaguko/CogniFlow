import { db } from './index.ts';
import { notes, users } from './schema.ts';
import { eq, desc, sql } from 'drizzle-orm';

export interface NoteItem {
  id: number;
  userUid: string;
  title: string;
  category: string;
  content: string;
  tags: string;
  metadata?: Record<string, any>;
  isActive?: boolean;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface SemanticSearchResult extends NoteItem {
  similarity: number; // 0 to 1
  distance: number;
}

export interface JsonbQueryAnalysisResult {
  querySql: string;
  strategyUsed: 'GIN (jsonb_ops)' | 'GIN (jsonb_path_ops)' | 'Expression B-Tree' | 'Partial Index' | 'None (Sequential Scan)';
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

export async function getOrCreateUserRecord(uid: string, email: string) {
  try {
    const existing = await db.select().from(users).where(eq(users.uid, uid)).limit(1);
    if (existing.length > 0) return existing[0];

    const inserted = await db.insert(users).values({ uid, email }).returning();
    return inserted[0];
  } catch (error) {
    console.error('getOrCreateUserRecord failed:', error);
    throw new Error('Database operation failed while finding or creating user.', { cause: error });
  }
}

export async function getUserNotes(userUid: string): Promise<NoteItem[]> {
  try {
    const results = await db
      .select({
        id: notes.id,
        userUid: notes.userUid,
        title: notes.title,
        category: notes.category,
        content: notes.content,
        tags: notes.tags,
        createdAt: notes.createdAt,
        updatedAt: notes.updatedAt,
      })
      .from(notes)
      .where(eq(notes.userUid, userUid))
      .orderBy(desc(notes.createdAt));
    return results;
  } catch (error) {
    console.error('getUserNotes failed:', error);
    throw new Error('Failed to fetch notes from database.', { cause: error });
  }
}

export async function insertNoteWithEmbedding(
  userUid: string,
  title: string,
  category: string,
  content: string,
  tags: string,
  embedding: number[]
) {
  try {
    const vectorStr = `[${embedding.join(',')}]`;
    const result = await db.execute(
      sql`INSERT INTO notes (user_uid, title, category, content, tags, embedding, created_at, updated_at)
          VALUES (${userUid}, ${title}, ${category}, ${content}, ${tags}, ${vectorStr}::vector, NOW(), NOW())
          RETURNING id, user_uid as "userUid", title, category, content, tags, created_at as "createdAt", updated_at as "updatedAt"`
    );
    return result.rows[0];
  } catch (error) {
    console.error('insertNoteWithEmbedding failed:', error);
    throw new Error('Failed to insert note with vector embedding.', { cause: error });
  }
}

export async function deleteNote(id: number, userUid: string) {
  try {
    await db.delete(notes).where(sql`${notes.id} = ${id} AND ${notes.userUid} = ${userUid}`);
    return true;
  } catch (error) {
    console.error('deleteNote failed:', error);
    throw new Error('Failed to delete note.', { cause: error });
  }
}

export async function searchNotesSemantic(
  userUid: string,
  queryEmbedding: number[],
  limit: number = 5,
  minSimilarity: number = 0.25
): Promise<SemanticSearchResult[]> {
  try {
    const vectorStr = `[${queryEmbedding.join(',')}]`;
    const result = await db.execute(
      sql`SELECT 
            id, 
            user_uid as "userUid", 
            title, 
            category, 
            content, 
            tags, 
            created_at as "createdAt", 
            updated_at as "updatedAt",
            (1 - (embedding <=> ${vectorStr}::vector)) AS similarity,
            (embedding <=> ${vectorStr}::vector) AS distance
          FROM notes
          WHERE user_uid = ${userUid} AND embedding IS NOT NULL
          ORDER BY embedding <=> ${vectorStr}::vector ASC
          LIMIT ${limit}`
    );

    return result.rows
      .map((row: Record<string, unknown>) => {
        const createdRaw = row.createdAt;
        const updatedRaw = row.updatedAt;
        const createdAt =
          typeof createdRaw === 'string' || typeof createdRaw === 'number' || createdRaw instanceof Date
            ? new Date(createdRaw as string | number | Date)
            : null;
        const updatedAt =
          typeof updatedRaw === 'string' || typeof updatedRaw === 'number' || updatedRaw instanceof Date
            ? new Date(updatedRaw as string | number | Date)
            : null;
        return {
          id: Number(row.id),
          userUid: String(row.userUid),
          title: String(row.title),
          category: String(row.category || 'Ghi chú'),
          content: String(row.content),
          tags: String(row.tags || ''),
          metadata: (row.metadata as Record<string, any>) || {},
          isActive: row.isActive !== false,
          createdAt,
          updatedAt,
          similarity: Math.max(0, Math.min(1, Number(row.similarity || 0))),
          distance: Number(row.distance || 0),
        };
      })
      .filter((item: { similarity: number }) => item.similarity >= minSimilarity);
  } catch (error) {
    console.error('searchNotesSemantic failed:', error);
    throw new Error('Failed to execute semantic vector search.', { cause: error });
  }
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
  if ((indexType === 'gin_ops' || indexType === 'gin_path_ops') && (operator === '->>' || operator === '->')) {
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
      recommendation:
        `Giải pháp: Thay vì dùng "metadata->>'${sampleKey}' = '${sampleValue}'", hãy chuyển sang toán tử bao hàm "metadata @> '{"${sampleKey}": "${sampleValue}"}'::jsonb" để kích hoạt GIN Index, hoặc tạo một Expression B-Tree index trên (metadata->>'${sampleKey}').`,
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
      recommendation:
        `Tối ưu hoàn hảo: Expression B-Tree Index trên (metadata->>'${sampleKey}') được kích hoạt trực tiếp với chi phí thấp nhất cho các phép so sánh =, <, >, BETWEEN, IN.`,
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
    recommendation: 'Chưa có Index phù hợp: Cần lập chỉ mục theo 1 trong 4 chiến lược để tăng tốc truy vấn.',
  };
}
