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
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface SemanticSearchResult extends NoteItem {
  similarity: number; // 0 to 1
  distance: number;
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
