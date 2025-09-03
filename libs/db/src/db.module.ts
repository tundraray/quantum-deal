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
import databaseConfig from './config/database.config';

@Module({
  imports: [ConfigModule.forFeature(databaseConfig)],
  providers: [
    ...drizzleProvider,
    UsersRepository,
    ManagersRepository,
    OrdersRepository,
    MessagesRepository,
    SubscriptionsRepository,
    CodesRepository,
    SummaryRepository,
  ],
  exports: [
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
