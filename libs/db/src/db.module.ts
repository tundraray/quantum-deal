import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { drizzleProvider } from './database.provider';
import {
  UsersRepository,
  ManagersRepository,
  OrdersRepository,
  MessagesRepository,
  SubscriptionsRepository,
  CodesRepository,
  SummaryRepository,
} from './repositories';

@Module({
  imports: [ConfigModule],
  providers: [...drizzleProvider],
  exports: [...drizzleProvider],
})
export class DrizzleModule {}

/**
 * Database module that provides Drizzle ORM client and database configuration
 *
 * This module:
 * - Registers the database configuration using ConfigModule.forFeature()
 * - Provides the Drizzle ORM client through drizzleProvider
 * - Exports all repositories for use in other modules
 *
 * Usage:
 * Import this module in your feature modules to access database repositories
 */
@Module({
  imports: [
    // Register the database configuration namespace
    ConfigModule,
    DrizzleModule,
  ],
  providers: [
    // Database connection provider
    ...drizzleProvider,
    // Repository providers
    UsersRepository,
    ManagersRepository,
    OrdersRepository,
    MessagesRepository,
    SubscriptionsRepository,
    CodesRepository,
    SummaryRepository,
  ],
  exports: [
    // Export the database client for direct access if needed
    ...drizzleProvider,
    // Export all repositories for use in other modules
    UsersRepository,
    ManagersRepository,
    OrdersRepository,
    MessagesRepository,
    SubscriptionsRepository,
    CodesRepository,
    SummaryRepository,
  ],
})
export class DbModule {}
