import { registerAs } from '@nestjs/config';

export interface DatabaseConfig {
  url: string;
  maxConnections?: number;
  ssl?: boolean;
  schema?: string;
}

export default registerAs('database', (): DatabaseConfig => {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  return {
    url: databaseUrl,
    maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '10', 10),
    ssl: process.env.NODE_ENV === 'production',
    schema: process.env.DB_SCHEMA || 'public',
  };
});
