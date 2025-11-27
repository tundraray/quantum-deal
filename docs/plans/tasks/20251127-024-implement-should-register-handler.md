# Task: Implement shouldRegisterHandler() Method

Metadata:
- Phase: 3 (Handler Registration)
- Dependencies: Task 20251127-023 (registerComposers)
- Provides: Feature flag evaluation for conditional handler registration
- Size: Small (1 file)
- Verification Level: L2 (Unit tests pass)
- AC Coverage: AC-4 (Handler Registration)

## Implementation Content
Implement the `shouldRegisterHandler()` method that checks @RequiresFeature metadata against bot settings to determine if a handler should be registered.

Design Doc Reference: Section "DynamicListenersExplorerService" - shouldRegisterHandler

## Target Files
- [x] `libs/telegraf/src/services/dynamic-listeners-explorer.service.ts` (modify)
- [x] `libs/telegraf/src/services/__tests__/dynamic-listeners-explorer.service.spec.ts` (modify tests)

## Implementation Steps (TDD: Red-Green-Refactor)

### 1. Red Phase
- [x] Update tests for feature flag filtering:
  ```typescript
  describe('AC-4: Feature Flag Handler Filtering (@RequiresFeature)', () => {
    it('@RequiresFeature handler only registered on bots with matching feature enabled', () => {
      @Update()
      @RequiresFeature('paymentsEnabled')
      class PaymentHandler {
        @Command('pay')
        onPay() {}
      }

      setupModuleMock([PaymentHandler])

      const settingsWithPayments: BotSettings = {
        features: { paymentsEnabled: true, trialEnabled: false, signalsEnabled: true, broadcastEnabled: true },
        defaults: { subscriptionDays: 30, trialDays: 7, language: 'en' }
      }

      const settingsWithoutPayments: BotSettings = {
        features: { paymentsEnabled: false, trialEnabled: false, signalsEnabled: true, broadcastEnabled: true },
        defaults: { subscriptionDays: 30, trialDays: 7, language: 'en' }
      }

      // Bot 1 has payments enabled
      service.registerHandlers(mockBot1, 1, mockStage1, settingsWithPayments)
      // Bot 2 does not have payments enabled
      service.registerHandlers(mockBot2, 2, mockStage2, settingsWithoutPayments)

      expect(mockBot1.command).toHaveBeenCalledWith('pay', expect.any(Function))
      expect(mockBot2.command).not.toHaveBeenCalled()
    })

    it('@RequiresFeature handler skipped when bot has no settings', () => {
      @Update()
      @RequiresFeature('paymentsEnabled')
      class PaymentHandler {
        @Command('pay')
        onPay() {}
      }

      setupModuleMock([PaymentHandler])

      // Bot has null settings
      service.registerHandlers(mockBot, 1, mockStage, null)

      expect(mockBot.command).not.toHaveBeenCalled()
    })

    it('handler without @RequiresFeature registered regardless of settings', () => {
      @Update()
      class AlwaysHandler {
        @Start()
        onStart() {}
      }

      setupModuleMock([AlwaysHandler])

      // Even with null settings
      service.registerHandlers(mockBot, 1, mockStage, null)

      expect(mockBot.start).toHaveBeenCalled()
    })
  })

  describe('Feature Flag Filtering', () => {
    it('evaluates feature flag against bot settings for handler registration', () => {
      const wrapper = createMockWrapper(PaymentHandler)
      const settings: BotSettings = {
        features: { paymentsEnabled: true, trialEnabled: false, signalsEnabled: true, broadcastEnabled: true },
        defaults: { subscriptionDays: 30, trialDays: 7, language: 'en' }
      }

      const result = service['shouldRegisterHandler'](wrapper, settings)

      expect(result).toBe(true)
    })

    it('returns false when feature is disabled', () => {
      const wrapper = createMockWrapper(PaymentHandler)
      const settings: BotSettings = {
        features: { paymentsEnabled: false, trialEnabled: false, signalsEnabled: true, broadcastEnabled: true },
        defaults: { subscriptionDays: 30, trialDays: 7, language: 'en' }
      }

      const result = service['shouldRegisterHandler'](wrapper, settings)

      expect(result).toBe(false)
    })
  })
  ```
- [x] Run tests - confirm failures

### 2. Green Phase
- [x] Implement `shouldRegisterHandler()`:
  ```typescript
  /**
   * Check if handler should be registered based on feature flags
   */
  private shouldRegisterHandler(
    wrapper: InstanceWrapper,
    settings: BotSettings | null
  ): boolean {
    const featureFlag = this.metadataAccessor.getFeatureFlagMetadata(
      wrapper.metatype as Function
    )

    if (!featureFlag) return true // No feature flag = always register
    if (!settings?.features) return false // Has flag but no settings = skip

    const features = settings.features as Record<string, boolean>
    return features[featureFlag] === true
  }
  ```

### 3. Refactor Phase
- [x] Ensure type safety for features access
- [x] Run tests - confirm passing
- [x] Run build to verify compilation

## Test Cases (AC-4)

| Test | Description | Status |
|------|-------------|--------|
| "@RequiresFeature handler only on bots with feature enabled" | Feature flag matching | Pass |
| "@RequiresFeature handler skipped when settings null" | Null settings handling | Pass |
| "handler without @RequiresFeature registered regardless" | No flag = always | Pass |
| "evaluates feature flag against settings" | Direct evaluation | Pass |
| "returns false when feature disabled" | Feature disabled | Pass |

## Completion Criteria
- [x] `shouldRegisterHandler()` extracts @RequiresFeature metadata
- [x] Returns true when no feature flag (always register)
- [x] Returns false when feature flag present but settings null
- [x] Evaluates feature flag against `settings.features[key]`
- [x] Related unit tests pass
- [x] `npm run build` passes

## Verification Commands
```bash
npm run test -- libs/telegraf/src/services/__tests__/dynamic-listeners-explorer.service.spec.ts --grep "Feature"
npm run build
```

## Notes
- Impact scope: DynamicListenersExplorerService
- Constraints: Feature keys must match BotSettings.features property names
- Handlers without @RequiresFeature are always registered (shared handlers)
