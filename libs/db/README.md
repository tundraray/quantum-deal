# Database Module (@quantumdeal/db)

A NestJS database module built with Drizzle ORM for PostgreSQL, following clean architecture principles.

## Features

- **Type-safe database operations** with Drizzle ORM
- **Repository pattern** for clean data access
- **Transaction support** for complex operations
- **Connection pooling** using Neon serverless PostgreSQL
- **Migration system** for schema versioning
- **Health checks** for monitoring
- **Clean separation of concerns** following NestJS patterns

## Setup

### 1. Environment Configuration

Copy the example environment file and configure your database:

```bash
cp .env.example .env
```

Update the `DATABASE_URL` in your `.env` file:

```env
DATABASE_URL="postgresql://username:password@localhost:5432/quantum_deal"
```

For Neon (recommended for serverless):
```env
DATABASE_URL="postgresql://username:password@ep-example-123456.us-east-1.aws.neon.tech/dbname?sslmode=require"
```

### 2. Import the Module

Import the `DbModule` in your application module:

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DbModule } from '@quantumdeal/db';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DbModule,
    // ... other modules
  ],
})
export class AppModule {}
```

### 3. Generate and Run Migrations

Generate migration files from your schema:

```bash
pnpm run db:generate
```

Apply migrations to your database:

```bash
pnpm run db:migrate
```

## Usage

### Repository Injection

Inject repositories in your services:

```typescript
import { Injectable } from '@nestjs/common';
import { UsersRepository } from '@quantumdeal/db';

@Injectable()
export class UserService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async createUser(telegramId: string, userData: any) {
    return this.usersRepository.upsertByTelegramId({
      telegramId,
      ...userData,
    });
  }
}
```

### Direct Database Access

For complex queries, inject the `DatabaseService`:

```typescript
import { Injectable } from '@nestjs/common';
import { DatabaseService } from '@quantumdeal/db';
import { users } from '@quantumdeal/db/schema';
import { eq } from 'drizzle-orm';

@Injectable()
export class AdvancedUserService {
  constructor(private readonly databaseService: DatabaseService) {}

  async getCustomUserData() {
    return this.databaseService.db
      .select()
      .from(users)
      .where(eq(users.isPremium, true));
  }
}
```

### Transactions

Use transactions for multiple related operations:

```typescript
async transferUserData(fromUserId: string, toUserId: string) {
  return this.databaseService.transaction(async (tx) => {
    // Multiple operations within transaction
    const fromUser = await tx.select().from(users).where(eq(users.telegramId, fromUserId));
    const toUser = await tx.select().from(users).where(eq(users.telegramId, toUserId));
    
    // ... perform operations
    
    return { fromUser, toUser };
  });
}
```

## Available Commands

- `pnpm run db:generate` - Generate migration files from schema changes
- `pnpm run db:migrate` - Apply pending migrations to database
- `pnpm run db:push` - Push schema changes directly (dev only)
- `pnpm run db:studio` - Open Drizzle Studio for database management

## Schema Structure

### Users Table
- Stores Telegram user information
- Tracks user activity and premium status
- Supports user management operations

### Chats Table
- Stores Telegram chat/group information
- Tracks chat types (private, group, supergroup, channel)
- Member count tracking

### Sessions Table
- User session management
- Token-based authentication
- Automatic expiration handling

## Repository Methods

Each repository extends `BaseRepository` and provides:

- `findById(id)` - Find record by primary key
- `findAll()` - Get all records
- `create(data)` - Create new record
- `update(id, data)` - Update existing record
- `delete(id)` - Delete record
- `findBy(condition)` - Find records by condition
- `findOneBy(condition)` - Find single record by condition
- `transaction(callback)` - Execute within transaction

### Specialized Repository Methods

**UsersRepository:**
- `findByTelegramId(telegramId)`
- `findByUsername(username)`
- `upsertByTelegramId(userData)`
- `findActiveUsers()`
- `findPremiumUsers()`

**ChatsRepository:**
- `findByTelegramId(telegramId)`
- `upsertByTelegramId(chatData)`
- `findByType(type)`
- `updateMemberCount(telegramId, count)`

**SessionsRepository:**
- `findByUserId(userId)`
- `createSession(userId, sessionKey, data, hours)`
- `extendSession(sessionKey, hours)`
- `invalidateSession(sessionKey)`

## Best Practices

1. **Always use repositories** for data access in services
2. **Use transactions** for operations that modify multiple tables
3. **Handle database errors** appropriately in your services
4. **Use type-safe operations** with Drizzle's query builder
5. **Run migrations** in production environments
6. **Monitor database health** using the health check endpoint

## Health Check

The database service includes a health check method:

```typescript
const isHealthy = await this.databaseService.healthCheck();
```

This can be integrated with NestJS health checks for monitoring.