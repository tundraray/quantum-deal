import { ConfigService } from '@nestjs/config';
import { drizzle, type NeonDatabase } from 'drizzle-orm/neon-serverless';
import { Pool } from '@neondatabase/serverless';
import * as schema from './schema';
import { Logger } from '@nestjs/common';

export const DRIZZLE_CLIENT = 'DRIZZLE_CLIENT';

export type DrizzleClient = NeonDatabase<typeof schema>;

export const drizzleProvider = [
  {
    provide: DRIZZLE_CLIENT,
    inject: [ConfigService],
    useFactory: (configService: ConfigService): DrizzleClient => {
      const logger = new Logger('DrizzleProvider');

      try {
        const connectionString =
          configService.get<string>('DATABASE_URL') ||
          configService.get<string>('database.url');

        if (!connectionString) {
          throw new Error(
            'DATABASE_URL environment variable is required for database connection',
          );
        }

        const pool = new Pool({ connectionString });
        const client = drizzle(pool, { schema, casing: 'snake_case' });

        logger.log('Drizzle database client created successfully');

        return client as DrizzleClient;
      } catch (error) {
        logger.error('Failed to create Drizzle database client', error);
        throw error;
      }
    },
  },
];
