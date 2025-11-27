# Task: Implement initializeBot() Method

Metadata:
- Phase: 2 (Core Service)
- Dependencies: Task 20251127-009 (per-bot Stage)
- Provides: Full bot initialization with token validation and middleware
- Size: Small (1 file)
- Verification Level: L2 (Unit tests pass)
- AC Coverage: AC-2 (Database Loading), AC-3 (Stage Isolation)

## Implementation Content
Complete the `initializeBot()` method implementation including:
- Telegraf instance creation
- Token validation via `telegram.getMe()`
- Global middleware application
- Bot-specific middleware from factory
- Stage middleware application
- Handler registration call (placeholder for Phase 3)

Design Doc Reference: Section "Component Specifications" - DynamicTelegrafService

## Target Files
- [x] `libs/telegraf/src/services/dynamic-telegraf.service.ts` (modify)
- [x] `libs/telegraf/src/services/__tests__/dynamic-telegraf.service.spec.ts` (modify tests)

## Implementation Steps (TDD: Red-Green-Refactor)

### 1. Red Phase
- [x] Add bot initialization tests:
  ```typescript
  describe('Bot Initialization', () => {
    it('validates bot token via telegram.getMe()', async () => {
      mockTelegram.getMe.mockResolvedValue({ id: 123, username: 'testbot' })

      await service.onModuleInit()

      expect(mockTelegram.getMe).toHaveBeenCalled()
    })

    it('applies global middlewares to bot', async () => {
      const mockMiddleware = vi.fn()
      options.globalMiddlewares = [mockMiddleware]

      await service.onModuleInit()

      expect(mockBot.use).toHaveBeenCalledWith(mockMiddleware)
    })

    it('applies bot-specific middlewares from factory', async () => {
      const botSpecificMiddleware = vi.fn()
      options.middlewareFactory = vi.fn().mockReturnValue([botSpecificMiddleware])

      await service.onModuleInit()

      expect(options.middlewareFactory).toHaveBeenCalled()
      expect(mockBot.use).toHaveBeenCalledWith(botSpecificMiddleware)
    })

    it('applies Stage middleware to bot', async () => {
      await service.onModuleInit()

      // Stage.middleware() should be called
      expect(mockStage.middleware).toHaveBeenCalled()
    })

    it('stores username from getMe() response', async () => {
      mockTelegram.getMe.mockResolvedValue({ id: 123, username: 'actualbot' })

      await service.onModuleInit()

      const instance = service.getBotInstance(1)
      expect(instance?.username).toBe('actualbot')
    })
  })
  ```
- [x] Run tests - confirm failures

### 2. Green Phase
- [x] Update `initializeBot()` with full implementation:
  ```typescript
  private async initializeBot(config: DynamicBotConfig): Promise<BotInitResult> {
    const { id, name, token, webhookPath, settings } = config

    try {
      // Create Telegraf instance with optional global options
      const bot = new Telegraf<Context>(token, this.options.telegrafOptions)

      // Validate token by calling getMe()
      const botInfo = await bot.telegram.getMe()
      const username = botInfo.username

      // Log username mismatch if detected
      if (config.username && config.username !== username) {
        this.logger.warn(
          `Bot "${name}": username mismatch - DB: ${config.username}, Telegram: ${username}`
        )
      }

      // Create per-bot Stage instance
      const stage = new Scenes.Stage<Scenes.SceneContext>([])

      // Apply global middlewares
      if (this.options.globalMiddlewares) {
        for (const middleware of this.options.globalMiddlewares) {
          bot.use(middleware)
        }
      }

      // Apply bot-specific middlewares from factory
      if (this.options.middlewareFactory) {
        const botMiddlewares = this.options.middlewareFactory(config)
        for (const middleware of botMiddlewares) {
          bot.use(middleware)
        }
      }

      // Apply stage middleware
      bot.use(stage.middleware())

      // Setup global error handler
      bot.catch((err, ctx) => {
        this.logger.error(
          `Error in bot "${name}" (@${username}): ${err.message}`,
          err.stack
        )
      })

      // Store bot instance
      const instance: DynamicBotInstance = {
        botId: id,
        name,
        bot,
        stage,
        webhookPath,
        settings: settings ?? null,
        username,
      }

      this.bots.set(id, instance)
      this.webhookPathIndex.set(webhookPath, id)

      this.logger.log(`Dynamic bot started: "${name}" (@${username})`)

      return { success: true, botId: id, name, username }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      // Mask token in error messages
      const safeError = errorMessage.replace(/\d+:[A-Za-z0-9_-]+/g, '***:****')
      return { success: false, botId: id, name, error: safeError }
    }
  }
  ```

### 3. Refactor Phase
- [x] Ensure middleware ordering: global -> bot-specific -> stage
- [x] Verify error handler catches all errors
- [x] Run tests - confirm passing
- [x] Run build to verify compilation

## Test Cases

| Test | Description | Status |
|------|-------------|--------|
| "validates bot token via telegram.getMe()" | Token validation | Pass |
| "applies global middlewares to bot" | Global middleware | Pass |
| "applies bot-specific middlewares from factory" | Factory pattern | Pass |
| "applies Stage middleware to bot" | Stage middleware | Pass |
| "stores username from getMe() response" | Username storage | Pass |

## Completion Criteria
- [x] Token validated via `telegram.getMe()`
- [x] Global middlewares applied in order
- [x] Bot-specific middlewares from factory applied
- [x] Stage middleware applied last
- [x] Error handler registered
- [x] Username stored from Telegram response
- [x] Token masked in error messages
- [x] All initialization unit tests pass
- [x] `npm run build` passes

## Verification Commands
```bash
npm run test -- libs/telegraf/src/services/__tests__/dynamic-telegraf.service.spec.ts --grep "Bot Initialization"
npm run build
```

## Notes
- Impact scope: DynamicTelegrafService only
- Constraints: Middleware ordering critical (global -> factory -> stage)
- Webhook setup will be added in a subsequent task
- Handler registration (listenersExplorer) will be added in Phase 3
