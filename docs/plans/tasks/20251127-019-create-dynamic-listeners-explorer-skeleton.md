# Task: Create DynamicListenersExplorerService Skeleton

Metadata:
- Phase: 3 (Handler Registration)
- Dependencies: Task 20251127-018 (MetadataAccessor extended)
- Provides: Service class structure for handler registration on dynamic bots
- Size: Small (1 file)
- Verification Level: L3 (Build Success)

## Implementation Content
Create the skeleton structure of DynamicListenersExplorerService that extends BaseExplorerService with constructor injection and stub methods.

Design Doc Reference: Section "Component Specifications" - DynamicListenersExplorerService

## Target Files
- [x] `libs/telegraf/src/services/dynamic-listeners-explorer.service.ts` (new)

## Implementation Steps (TDD: Red-Green-Refactor)

### 1. Red Phase
- [x] Unit tests from Phase 0 still in Red state for this service

### 2. Green Phase
- [x] Create new file `dynamic-listeners-explorer.service.ts`
- [x] Add imports from existing services and interfaces
- [x] Define `@Injectable()` class extending `BaseExplorerService`
- [x] Add constructor with dependency injection:
  ```typescript
  constructor(
    @Inject(DYNAMIC_TELEGRAF_MODULE_OPTIONS)
    private readonly options: TelegrafDynamicModuleOptions,
    private readonly modulesContainer: ModulesContainer,
    private readonly metadataAccessor: MetadataAccessorService,
    private readonly metadataScanner: MetadataScanner,
    private readonly externalContextCreator: ExternalContextCreator,
  ) {
    super()
  }
  ```
- [x] Add private properties:
  - `logger: Logger`
  - `telegrafParamsFactory: TelegrafParamsFactory`
- [x] Add stub methods:
  - `async registerHandlers(bot, botId, stage, settings): Promise<void>`
  - `private registerUpdates(modules, bot, botId, settings): void`
  - `private registerComposers(modules, stage): void`
  - `private registerScenes(modules, stage, botId): void`
  - `private shouldRegisterHandler(wrapper, settings): boolean`
  - `private filterUpdates(wrapper): InstanceWrapper | undefined`
  - `private filterComposers(wrapper): InstanceWrapper | undefined`
  - `private filterScenes(wrapper): InstanceWrapper | undefined`
  - `private registerListeners(composer, wrapper): void`
  - `private registerWizardListeners(wizard, wrapper): void`
  - `private registerIfListener(...): void`
  - `createContextCallback(instance, prototype, methodName): Function`

### 3. Refactor Phase
- [x] Ensure consistent method ordering
- [x] Add JSDoc comments to public methods
- [x] Run build to verify compilation

## Class Structure
```typescript
@Injectable()
export class DynamicListenersExplorerService extends BaseExplorerService {
  private readonly logger = new Logger(DynamicListenersExplorerService.name)
  private readonly telegrafParamsFactory = new TelegrafParamsFactory()

  constructor(
    @Inject(DYNAMIC_TELEGRAF_MODULE_OPTIONS) private readonly options: TelegrafDynamicModuleOptions,
    private readonly modulesContainer: ModulesContainer,
    private readonly metadataAccessor: MetadataAccessorService,
    private readonly metadataScanner: MetadataScanner,
    private readonly externalContextCreator: ExternalContextCreator,
  ) { super() }

  // Public API
  async registerHandlers(bot, botId, stage, settings): Promise<void> {
    throw new Error('Not implemented')
  }

  // Private methods (stubs)
  private registerUpdates(...): void { /* stub */ }
  private registerComposers(...): void { /* stub */ }
  private registerScenes(...): void { /* stub */ }
  private shouldRegisterHandler(...): boolean { return false }
  private filterUpdates(...): InstanceWrapper | undefined { return undefined }
  private filterComposers(...): InstanceWrapper | undefined { return undefined }
  private filterScenes(...): InstanceWrapper | undefined { return undefined }
  private registerListeners(...): void { /* stub */ }
  private registerWizardListeners(...): void { /* stub */ }
  private registerIfListener(...): void { /* stub */ }

  createContextCallback(instance, prototype, methodName) {
    throw new Error('Not implemented')
  }
}
```

## Completion Criteria
- [x] Service class created with all stub methods
- [x] Extends BaseExplorerService
- [x] Constructor injection configured
- [x] `npm run build` passes
- [x] Service importable from `./services/dynamic-listeners-explorer.service`

## Verification Commands
```bash
npm run build
npm run check
```

## Notes
- Impact scope: New file only
- Constraints: Must extend BaseExplorerService for module scanning utilities
- This task establishes the class structure; implementation follows in tasks 3.6-3.11
