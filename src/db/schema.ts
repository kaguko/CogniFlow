import { relations } from 'drizzle-orm';
import {
  pgTable,
  serial,
  text,
  timestamp,
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

// Notes & Documents table with pgvector semantic embeddings
export const notes = pgTable('notes', {
  id: serial('id').primaryKey(),
  userUid: text('user_uid').notNull(),
  title: text('title').notNull(),
  category: text('category').notNull().default('Ghi chú'),
  content: text('content').notNull(),
  tags: text('tags').notNull().default(''),
  embedding: pgVector('embedding'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  notes: many(notes),
}));

export const notesRelations = relations(notes, ({ one }) => ({
  author: one(users, {
    fields: [notes.userUid],
    references: [users.uid],
  }),
}));
