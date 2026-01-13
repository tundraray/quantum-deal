# Task: Add Service Layer Methods

Metadata:
- Dependencies: Task 0002 (Repository methods) -> Deliverable: bot-users.repository.ts
- Provides: `libs/masterbot/src/services/broadcast.service.ts` - count methods, sendBroadcastToNonSubscribers
- Size: Small (1 file + tests)
- Phase: 3 - Service Layer
- Verification Level: L2 (Test Operation Verification)
- Acceptance Criteria: AC3-AC6 foundation

## Implementation Content

Add service layer methods for counting and broadcasting to users without subscription. This task includes:
1. `countUsersWithoutSubscription(botId)` - delegates to repository
2. `countAllSubscribers(subscriptionId, filterBotId?)` - counts all statuses
3. `sendBroadcastToNonSubscribers(botId, message, entities, managerId)` - broadcast to non-subscribers

## Target Files

- [ ] `libs/masterbot/src/services/broadcast.service.ts`
- [ ] `libs/masterbot/src/services/__tests__/broadcast.service.test.ts` (unit tests)

## Implementation Steps (TDD: Red-Green-Refactor)

### 1. Red Phase

- [ ] Review existing BroadcastService methods for patterns
- [ ] Review existing constructor dependencies
- [ ] Write failing tests for new methods:

```typescript
describe('countUsersWithoutSubscription', () => {
  it('should return count from repository', async () => {
    // Arrange
    const botId = 1;
    mockBotUsersRepository.countWithoutSubscription.mockResolvedValue(5);

    // Act
    const result = await service.countUsersWithoutSubscription(botId);

    // Assert
    expect(result).toBe(5);
    expect(mockBotUsersRepository.countWithoutSubscription).toHaveBeenCalledWith(botId);
  });
});

describe('countAllSubscribers', () => {
  it('should count all subscribers regardless of status', async () => {
    // Arrange
    const subscriptionId = 1;
    const botId = 2;
    mockUserSubscriptionsRepository.count.mockResolvedValue(10);

    // Act
    const result = await service.countAllSubscribers(subscriptionId, botId);

    // Assert
    expect(result).toBe(10);
    // Verify no status filter applied
  });
});

describe('sendBroadcastToNonSubscribers', () => {
  it('should queue messages for users without subscription', async () => {
    // Arrange
    const botId = 1;
    const users = [{ botUser: { id: 1, telegramId: '123' } }];
    mockBotUsersRepository.findWithoutSubscription.mockResolvedValue(users);

    // Act
    const result = await service.sendBroadcastToNonSubscribers(
      botId, 'message', undefined, 999
    );

    // Assert
    expect(mockNotificationService.addMessages).toHaveBeenCalled();
    expect(result.recipientCount).toBe(1);
  });
});
```

- [ ] Run tests and confirm they fail

### 2. Green Phase

- [ ] Add BotUsersRepository to constructor injection:
  ```typescript
  constructor(
    // ... existing dependencies
    @Inject(forwardRef(() => BotUsersRepository))
    private readonly botUsersRepository: BotUsersRepository,
  ) {}
  ```

- [ ] Add `countUsersWithoutSubscription` method:
  ```typescript
  /**
   * Count bot users who have no subscription records
   * @param botId - The bot ID to filter by
   * @returns Count of users without any subscription
   */
  async countUsersWithoutSubscription(botId: number): Promise<number> {
    return this.botUsersRepository.countWithoutSubscription(botId);
  }
  ```

- [ ] Add `countAllSubscribers` method:
  ```typescript
  /**
   * Count all subscribers (active + expired) for a subscription
   * @param subscriptionId - The subscription to count
   * @param filterBotId - Optional bot filter
   * @returns Total subscriber count regardless of status
   */
  async countAllSubscribers(
    subscriptionId: number,
    filterBotId?: number | null,
  ): Promise<number> {
    // Use existing repository with no status filter
    return this.userSubscriptionsRepository.count(
      subscriptionId,
      undefined, // no status filter - counts all
      filterBotId,
    );
  }
  ```

- [ ] Add `sendBroadcastToNonSubscribers` method:
  ```typescript
  /**
   * Send broadcast to users who have no subscription records
   * @param botId - Target bot ID
   * @param message - Message text
   * @param entities - Message entities
   * @param managerId - Manager who initiated broadcast
   * @returns Broadcast result with recipient count
   */
  async sendBroadcastToNonSubscribers(
    botId: number,
    message: string,
    entities: MessageEntity[] | undefined,
    managerId: number,
  ): Promise<BroadcastResultDto> {
    const usersWithoutSub = await this.botUsersRepository.findWithoutSubscription(botId);

    if (usersWithoutSub.length === 0) {
      return { recipientCount: 0, status: 'completed' };
    }

    const bot = await this.botsRepository.findById(botId);
    if (!bot) {
      throw new Error(`Bot ${botId} not found`);
    }

    const messages = usersWithoutSub.map((item) => ({
      botToken: bot.token,
      chatId: item.botUser.telegramId,
      text: message,
      entities,
    }));

    await this.notificationService.addMessages(messages);

    this.logger.log(
      `Broadcast to ${usersWithoutSub.length} users without subscription for bot ${botId} by manager ${managerId}`,
    );

    return {
      recipientCount: usersWithoutSub.length,
      status: 'queued',
    };
  }
  ```

- [ ] Run tests and confirm they pass

### 3. Refactor Phase

- [ ] Ensure consistent error handling patterns
- [ ] Verify logging is appropriate
- [ ] Confirm all tests still pass

## Expected Method Signatures

```typescript
// In BroadcastService class

async countUsersWithoutSubscription(botId: number): Promise<number>

async countAllSubscribers(
  subscriptionId: number,
  filterBotId?: number | null,
): Promise<number>

async sendBroadcastToNonSubscribers(
  botId: number,
  message: string,
  entities: MessageEntity[] | undefined,
  managerId: number,
): Promise<BroadcastResultDto>
```

## Completion Criteria

- [ ] All three methods implemented with correct signatures
- [ ] Unit tests written and passing
- [ ] BotUsersRepository injected into constructor
- [ ] Methods follow existing service patterns
- [ ] Build succeeds without errors (`pnpm build`)
- [ ] Type check passes (`pnpm typecheck`)
- [ ] Tests pass (`pnpm test`)

## Operational Verification Procedures

1. Run unit tests:
   ```bash
   pnpm test libs/masterbot/src/services/__tests__/broadcast.service.test.ts
   ```

2. Run all tests:
   ```bash
   pnpm test
   ```

3. Run quality checks:
   ```bash
   pnpm typecheck
   pnpm build
   ```

## Quality Check Commands

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

## Notes

- **Impact scope**: broadcast.service.ts and its tests
- **Constraints**: Must use existing repository and notification patterns
- **Dependencies**: Requires Phase 2 repository methods
- **Testing**: Unit tests with mocked dependencies
