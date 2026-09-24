import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';

dotenv.config();

const databaseUrl = process.env.DATABASE_URL;
const sqlHost = process.env.SQL_HOST;
const sqlDbName = process.env.SQL_DB_NAME;
const user = process.env.SQL_ADMIN_USER;
const password = process.env.SQL_ADMIN_PASSWORD;

if (!databaseUrl && !sqlHost) {
  throw new Error('SQL_HOST must be set in environment variables.');
}
if (!databaseUrl && !sqlDbName) {
  throw new Error('SQL_DB_NAME must be set in environment variables.');
}
if (!databaseUrl && !user) {
  throw new Error('SQL_ADMIN_USER must be set in environment variables.');
}
if (!databaseUrl && !password) {
  throw new Error('SQL_ADMIN_PASSWORD must be set in environment variables.');
}

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  schemaFilter: ['public'],
  dbCredentials: databaseUrl
    ? { url: databaseUrl }
    : {
        host: sqlHost!,
        user: user!,
        password: password!,
        database: sqlDbName!,
        ssl: false,
      },
  verbose: true,
});
