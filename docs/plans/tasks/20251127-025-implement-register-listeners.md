# Task: Implement registerListeners() and createContextCallback()

Metadata:
- Phase: 3 (Handler Registration)
- Dependencies: Task 20251127-024 (shouldRegisterHandler)
- Provides: Listener method registration with NestJS context integration
- Size: Small (1 file)
- Verification Level: L2 (Unit tests pass)
- AC Coverage: AC-4 (Handler Registration)

## Implementation Content
Implement the `registerListeners()`, `registerIfListener()`, `registerWizardListeners()`, and `createContextCallback()` methods that scan handler classes for listener decorators and bind them to Telegraf/Composer instances with NestJS dependency injection support.

Design Doc Reference: Section "DynamicListenersExplorerService" - registerListeners, createContextCallback

## Target Files
- [x] `libs/telegraf/src/services/dynamic-listeners-explorer.service.ts` (modify)
- [x] `libs/telegraf/src/services/__tests__/dynamic-listeners-explorer.service.spec.ts` (modify tests)

## Implementation Steps (TDD: Red-Green-Refactor)

### 1. Red Phase
- [x] Update tests for listener registration:
  ```typescript
  describe('Listener Registration', () => {
    it('registers @Start, @Command, @On decorated methods on Composer', () => {
      @Update()
      class TestHandler {
        @Start()
        onStart() { return 'started' }

        @Command('help')
        onHelp() { return 'help' }

        @On('message')
        onMessage() {}
      }

      setupModuleMock([TestHandler])

      service.registerHandlers(mockBot, 1, mockStage, null)

      expect(mockBot.start).toHaveBeenCalled()
      expect(mockBot.command).toHaveBeenCalledWith('help', expect.any(Function))
      expect(mockBot.on).toHaveBeenCalledWith('message', expect.any(Function))
    })

    it('wraps listener callbacks with NestJS external context', () => {
      @Update()
      class InjectedHandler {
        constructor(private service: SomeService) {}

        @Start()
        onStart(@Ctx() ctx) {
          return this.service.getMessage()
        }
      }

      setupModuleMock([InjectedHandler])

      service.registerHandlers(mockBot, 1, mockStage, null)

      // Verify callback was created with external context
      expect(mockExternalContextCreator.create).toHaveBeenCalled()
    })

    it('auto-replies with handler return value when non-void', async () => {
      @Update()
      class ReplyHandler {
        @Start()
        onStart() { return 'Hello!' }
      }

      setupModuleMock([ReplyHandler])
      service.registerHandlers(mockBot, 1, mockStage, null)

      // Get the registered callback
      const registeredCallback = mockBot.start.mock.calls[0][0]
      await registeredCallback(mockCtx, mockNext)

      expect(mockCtx.reply).toHaveBeenCalledWith('Hello!')
    })

    it('does not auto-reply when handler returns void', async () => {
      @Update()
      class VoidHandler {
        @Start()
        onStart() { /* no return */ }
      }

      setupModuleMock([VoidHandler])
      service.registerHandlers(mockBot, 1, mockStage, null)

      const registeredCallback = mockBot.start.mock.calls[0][0]
      await registeredCallback(mockCtx, mockNext)

      expect(mockCtx.reply).not.toHaveBeenCalled()
    })
  })
  ```
- [x] Run tests - confirm failures

### 2. Green Phase
- [x] Implement `registerListeners()`:
  ```typescript
  private registerListeners(
    composer: Composer<Context>,
    wrapper: InstanceWrapper<unknown>
  ): void {
    const { instance } = wrapper
    const prototype = Object.getPrototypeOf(instance)

    this.metadataScanner.scanFromPrototype(instance, prototype, (name) =>
      this.registerIfListener(composer, instance, prototype, name)
    )
  }
  ```
- [x] Implement `registerIfListener()`:
  ```typescript
  private registerIfListener(
    composer: Composer<Context>,
    instance: unknown,
    prototype: Record<string, unknown>,
    methodName: string,
    defaultMetadata?: ListenerMetadata[]
  ): void {
    const methodRef = prototype[methodName] as Function
    const metadata =
      this.metadataAccessor.getListenerMetadata(methodRef) || defaultMetadata

    if (!metadata || metadata.length < 1) return

    const listenerCallbackFn = this.createContextCallback(
      instance as Record<string, unknown>,
      prototype,
      methodName
    )

    for (const { method, args } of metadata) {
      const composerMethod = composer[method as keyof Composer<Context>]
      if (typeof composerMethod !== 'function') {
        this.logger.warn(`Unknown composer method: ${method}`)
        continue
      }

      ;(composerMethod as Function).call(
        composer,
        ...args,
        async (ctx: Context, next: () => Promise<void>): Promise<void> => {
          const result = await listenerCallbackFn(ctx, next)
          if (result) {
            await ctx.reply(String(result))
          }
        }
      )
    }
  }
  ```
- [x] Implement `createContextCallback()`:
  ```typescript
  createContextCallback<T extends Record<string, unknown>>(
    instance: T,
    prototype: Record<string, unknown>,
    methodName: string
  ) {
    const paramsFactory = this.telegrafParamsFactory
    const methodRef = prototype[methodName] as (...args: unknown[]) => unknown

    return this.externalContextCreator.create<
      Record<number, ParamMetadata>,
      TelegrafContextType
    >(
      instance,
      methodRef,
      methodName,
      PARAM_ARGS_METADATA,
      paramsFactory,
      undefined,
      undefined,
      undefined,
      'telegraf'
    )
  }
  ```
- [x] Implement `registerWizardListeners()`:
  ```typescript
  private registerWizardListeners(
    wizard: Scenes.WizardScene<Scenes.WizardContext>,
    wrapper: InstanceWrapper<unknown>
  ): void {
    const { instance } = wrapper
    const prototype = Object.getPrototypeOf(instance)

    type WizardMetadata = { step: number; methodName: string }
    const wizardSteps: WizardMetadata[] = []
    const basicListeners: string[] = []

    this.metadataScanner.scanFromPrototype(
      instance,
      prototype,
      (methodName) => {
        const methodRef = prototype[methodName]
        const metadata = this.metadataAccessor.getWizardStepMetadata(methodRef)
        if (!metadata) {
          basicListeners.push(methodName)
          return undefined
        }
        wizardSteps.push({ step: metadata.step, methodName })
      }
    )

    // Register basic listeners first
    for (const methodName of basicListeners) {
      this.registerIfListener(wizard, instance, prototype, methodName)
    }

    // Group and sort wizard steps
    const group = wizardSteps
      .sort((a, b) => a.step - b.step)
      .reduce<Record<number, WizardMetadata[]>>(
        (prev, cur) => ({
          ...prev,
          [cur.step]: [...(prev[cur.step] || []), cur],
        }),
        {}
      )

    // Create step middleware
    wizard.steps = Object.values(group).map((stepsMetadata) => {
      const composer = new Composer()
      for (const stepMethod of stepsMetadata) {
        this.registerIfListener(
          composer,
          instance,
          prototype,
          stepMethod.methodName,
          [{ method: 'use', args: [] }]
        )
      }
      return composer.middleware()
    })
  }
  ```

### 3. Refactor Phase
- [x] Ensure proper type safety
- [x] Run tests - confirm passing
- [x] Run build to verify compilation

## Test Cases

| Test | Description | Status |
|------|-------------|--------|
| "registers @Start, @Command, @On methods" | Method registration | Pass |
| "wraps callbacks with NestJS external context" | DI integration | Pass |
| "auto-replies with return value" | Auto-reply | Pass |
| "does not auto-reply when void" | No auto-reply | Pass |

## Completion Criteria
- [x] `registerListeners()` scans prototype for listener methods
- [x] `registerIfListener()` binds listeners to composer
- [x] `createContextCallback()` integrates with NestJS DI
- [x] Auto-reply works for non-void return values
- [x] `registerWizardListeners()` handles @WizardStep methods
- [x] Related unit tests pass
- [x] `npm run build` passes

## Verification Commands
```bash
npm run test -- libs/telegraf/src/services/__tests__/dynamic-listeners-explorer.service.spec.ts --grep "Listener"
npm run build
```

## Notes
- Impact scope: DynamicListenersExplorerService
- Constraints: Must use ExternalContextCreator for NestJS DI
- This is the core of handler registration functionality
