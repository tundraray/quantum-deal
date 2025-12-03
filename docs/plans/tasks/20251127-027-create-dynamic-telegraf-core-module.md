# Task: Create DynamicTelegrafCoreModule

Metadata:
- Phase: 4 (Module Integration)
- Dependencies: Phase 3 completion (all services implemented)
- Provides: NestJS dynamic module for dynamic bot infrastructure
- Size: Small (1 file)
- Verification Level: L1 (Functional Operation)
- AC Coverage: AC-1 (forRootDynamic Coexistence)

## Implementation Content
Create the DynamicTelegrafCoreModule that wires up all providers for dynamic bot loading infrastructure as a global NestJS module.

Design Doc Reference: Section "Component Specifications" - DynamicTelegrafCoreModule

## Target Files
- [x] `libs/telegraf/src/dynamic-telegraf-core.module.ts` (new)

## Implementation Steps (TDD: Red-Green-Refactor)

### 1. Red Phase
- [x] Integration tests for module coexistence will be created in Task 4.4

### 2. Green Phase
- [x] Create new file `dynamic-telegraf-core.module.ts`:
  ```typescript
  import {
    DynamicModule,
    Global,
    Module,
    Provider,
  } from '@nestjs/common'
  import { DiscoveryModule } from '@nestjs/core'
  import {
    TelegrafDynamicModuleOptions,
    BOT_CONFIGURATION_PROVIDER,
  } from './interfaces'
  import {
    DYNAMIC_TELEGRAF_MODULE_OPTIONS,
  } from './telegraf.constants'
  import { DynamicTelegrafService } from './services/dynamic-telegraf.service'
  import { DynamicListenersExplorerService } from './services/dynamic-listeners-explorer.service'
  import { MetadataAccessorService } from './services'

  /**
   * Core module for dynamic bot loading infrastructure
   *
   * This module is marked as @Global to allow DynamicTelegrafService
   * to be injected anywhere in the application for update routing.
   */
  @Global()
  @Module({
    imports: [DiscoveryModule],
    providers: [MetadataAccessorService],
  })
  export class DynamicTelegrafCoreModule {
    /**
     * Create dynamic module with bot configuration provider
     */
    public static forRoot(
      options: TelegrafDynamicModuleOptions,
    ): DynamicModule {
      const optionsProvider: Provider = {
        provide: DYNAMIC_TELEGRAF_MODULE_OPTIONS,
        useValue: options,
      }

      const botConfigProviderProvider: Provider = {
        provide: BOT_CONFIGURATION_PROVIDER,
        useClass: options.botConfigProvider,
      }

      return {
        module: DynamicTelegrafCoreModule,
        imports: [
          ...(options.imports || []),
          ...options.sharedHandlerModules,
        ],
        providers: [
          optionsProvider,
          botConfigProviderProvider,
          DynamicTelegrafService,
          DynamicListenersExplorerService,
        ],
        exports: [
          DynamicTelegrafService,
          DYNAMIC_TELEGRAF_MODULE_OPTIONS,
        ],
      }
    }
  }
  ```

### 3. Refactor Phase
- [x] Ensure proper provider ordering
- [x] Add JSDoc documentation
- [x] Run build to verify compilation

## Module Structure

```
DynamicTelegrafCoreModule
├── Imports
│   ├── DiscoveryModule (from @nestjs/core)
│   ├── options.imports (user-provided, e.g., DbModule)
│   └── options.sharedHandlerModules (handler modules to scan)
├── Providers
│   ├── DYNAMIC_TELEGRAF_MODULE_OPTIONS (options value)
│   ├── BOT_CONFIGURATION_PROVIDER (useClass: botConfigProvider)
│   ├── DynamicTelegrafService
│   ├── DynamicListenersExplorerService
│   └── MetadataAccessorService
└── Exports
    ├── DynamicTelegrafService
    └── DYNAMIC_TELEGRAF_MODULE_OPTIONS
```

## Completion Criteria
- [x] Module decorated with `@Global()` and `@Module()`
- [x] `forRoot()` static method creates DynamicModule
- [x] All required providers registered
- [x] DynamicTelegrafService exported for injection
- [x] `npm run build` passes
- [x] Module importable from package

## Verification Commands
```bash
npm run build
npm run check
```

## Notes
- Impact scope: New file only
- Constraints: Must be @Global for DynamicTelegrafService injection
- The module is consumed by TelegrafModule.forRootDynamic()
