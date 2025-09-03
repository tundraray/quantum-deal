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
        // Get the database configuration using the proper namespace
        const connectionString =
          configService.getOrThrow<string>('DATABASE_URL');

        // Create the connection pool with the configuration
        const pool = new Pool({
          connectionString: connectionString,
        });

        // Create the Drizzle client
        const client = drizzle(pool, {
          schema,
          casing: 'snake_case',
        });

        logger.log('Drizzle database client created successfully');

        return client as DrizzleClient;
      } catch (error) {
        logger.error('Failed to create Drizzle database client', error);
        throw error;
      }
    },
  },
];
