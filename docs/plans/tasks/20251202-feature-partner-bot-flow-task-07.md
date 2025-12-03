# Task: Register Partner-Bot Module in NestJS Application

Metadata:
- Dependencies: Tasks 1.3-1.6 (all services, actions, commands)
- Provides: Complete partner-bot module registration
- Size: Small (1 file)

## Implementation Content

Update PartnerBotModule with all providers (services, actions, commands) and export public API. Ensure dynamic bot loading compatibility with existing multi-bot architecture.

**Reference dependency deliverables:**
- Task 1.3: services/channel-verifier.service.ts
- Task 1.4: services/partner-flow.service.ts
- Task 1.5: commands/start/start.update.ts
- Task 1.6: actions/channel-verification.action.ts

## Target Files

- [x] `libs/partner-bot/src/partner-bot.module.ts`
- [x] `libs/partner-bot/src/index.ts`

## Implementation Steps (TDD: Red-Green-Refactor)

### 1. Red Phase
- [x] Review deliverables from Tasks 1.3, 1.4, 1.5, 1.6
- [x] Create `libs/partner-bot/src/__tests__/partner-bot.module.spec.ts`
- [x] Write failing tests:
  - Module imports successfully
  - All providers registered
  - No circular dependencies
  - Application starts without errors
- [x] Run tests and confirm failure

### 2. Green Phase
- [x] Update `libs/partner-bot/src/partner-bot.module.ts`:
  - Add @Module() decorator with providers array
  - Register services: ChannelVerifierService, PartnerFlowService
  - Register actions: ChannelVerificationAction
  - Register commands: StartCommandUpdate
  - Import required modules: DbModule (for repositories), BotModule (for TrialService, BotCommandsService)
  - Export PartnerFlowService (for potential external usage)
- [x] Update `libs/partner-bot/src/index.ts`:
  - Export all types from './types/partner-settings'
  - Export PartnerBotModule from './partner-bot.module'
  - Export services from './services/*' (if needed externally)
- [x] Verify no circular dependencies via module graph
- [x] Run only added tests and confirm they pass

### 3. Refactor Phase
- [x] Add JSDoc comments to module
- [x] Organize imports alphabetically
- [x] Ensure consistent export pattern
- [x] Confirm added tests still pass

## Completion Criteria

- [x] All added tests pass
- [x] Operation verified (L1: Module imports successfully, application starts without errors)
- [x] No circular dependencies detected
- [x] All services/actions/commands registered
- [x] Dynamic bot loading compatible (per ADR-006)

## Notes

**Impact Scope:**
- Completes Phase 1 foundation
- Enables integration testing (Task 1.10)
- Required for application runtime

**Constraints:**
- Must be compatible with existing multi-bot architecture (ADR-006)
- Must not break standard bot flow
- Must use NestJS module system correctly

**Module Structure:**
```typescript
@Module({
  imports: [DbModule, BotModule],
  providers: [
    ChannelVerifierService,
    PartnerFlowService,
    ChannelVerificationAction,
    StartCommandUpdate,
  ],
  exports: [PartnerFlowService], // If needed externally
})
export class PartnerBotModule {}
```
