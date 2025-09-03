import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  out: './libs/db/migrations',
  schema: './libs/db/src/schema/*',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
  migrations: {
    prefix: 'timestamp',
  },
  introspect: {
    casing: 'camel',
  },
});
