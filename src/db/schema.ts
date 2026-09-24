import { relations, sql } from 'drizzle-orm';
import {
  pgTable,
  serial,
  text,
  boolean,
  timestamp,
  jsonb,
  index,
  customType,
} from 'drizzle-orm/pg-core';

// PostgreSQL pgvector 768-dimension column definition for text-embedding-004
export const pgVector = customType<{ data: number[]; driverData: string }>({
  dataType() {
    return 'vector(768)';
  },
  toDriver(value: number[]): string {
    return `[${value.join(',')}]`;
  },
  fromDriver(value: string): number[] {
    if (typeof value !== 'string') return [];
    try {
      return value
        .replace(/^\[/, '')
        .replace(/\]$/, '')
        .split(',')
        .map((v) => Number(v.trim()));
    } catch {
      return [];
    }
  },
});

// Users table for Firebase Auth synchronization
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Notes & Documents table with pgvector semantic embeddings, 4 JSONB Indexing Strategies, & Stored Generated Column
export const notes = pgTable(
  'notes',
  {
    id: serial('id').primaryKey(),
    userUid: text('user_uid').notNull(),
    title: text('title').notNull(),
    category: text('category').notNull().default('Ghi chú'),
    content: text('content').notNull(),
    tags: text('tags').notNull().default(''),
    metadata: jsonb('metadata').$type<{
      priority?: string;
      framework?: string;
      techStack?: string[];
      architecture?: string;
      status?: string;
      metrics?: { difficulty?: number; impact?: number };
    }>().default({}),
    // PostgreSQL Stored Generated Column to avoid TOAST Tax on JSONB > 8KB
    extractedPriority: text('extracted_priority').generatedAlwaysAs(
      sql`metadata->>'priority'`
    ),
    isActive: boolean('is_active').notNull().default(true),
    embedding: pgVector('embedding'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    // Strategy 1: GIN (jsonb_ops) - Supports @>, ?, ?|, ?& (Full key existence & containment)
    ginOpsIdx: index('notes_metadata_gin_ops_idx').using('gin', table.metadata),

    // Strategy 2: GIN (jsonb_path_ops) - Supports ONLY @> (1/3 - 1/4 size, high-throughput document containment)
    ginPathOpsIdx: index('notes_metadata_gin_path_idx').using(
      'gin',
      sql`${table.metadata} jsonb_path_ops`
    ),

    // Strategy 3: Expression B-Tree - Supports =, <, >, BETWEEN, IN on scalar key extracted via ->>
    priorityBtreeIdx: index('notes_metadata_priority_btree_idx').on(
      sql`(${table.metadata}->>'priority')`
    ),

    // Strategy 4: Partial Index - Minimal storage overhead for filtered active records
    activeNotesGinIdx: index('notes_active_metadata_partial_idx')
      .using('gin', sql`${table.metadata} jsonb_path_ops`)
      .where(sql`${table.isActive} = true`),
      
    // Index on Stored Generated Column (Avoids TOAST decompression CPU overhead entirely)
    generatedPriorityIdx: index('notes_generated_priority_idx').on(table.extractedPriority),
  })
);

// High-Throughput Task Queue Table (Demonstrating FOR NO KEY UPDATE pattern)
export const taskQueue = pgTable(
  'task_queue',
  {
    id: serial('id').primaryKey(),
    noteId: serial('note_id').references(() => notes.id),
    taskPayload: jsonb('task_payload').default({}),
    status: text('status').notNull().default('pending'), // 'pending' | 'processing' | 'completed' | 'failed'
    workerId: text('worker_id'),
    lockedAt: timestamp('locked_at'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    statusIdx: index('task_queue_status_idx').on(table.status),
  })
);

export const usersRelations = relations(users, ({ many }) => ({
  notes: many(notes),
}));

export const notesRelations = relations(notes, ({ one }) => ({
  author: one(users, {
    fields: [notes.userUid],
    references: [users.uid],
  }),
}));
