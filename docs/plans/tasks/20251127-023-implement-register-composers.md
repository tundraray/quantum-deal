# Task: Implement registerComposers() Method

Metadata:
- Phase: 3 (Handler Registration)
- Dependencies: Task 20251127-022 (registerScenes)
- Provides: Registration of @Composer decorated classes as stage middlewares
- Size: Small (1 file)
- Verification Level: L2 (Unit tests pass)
- AC Coverage: AC-4 (Handler Registration)

## Implementation Content
Implement the `registerComposers()` method that filters @Composer decorated classes and registers them as middlewares on the per-bot Stage.

Design Doc Reference: Section "DynamicListenersExplorerService" - registerComposers

## Target Files
- [x] `libs/telegraf/src/services/dynamic-listeners-explorer.service.ts` (modify)
- [x] `libs/telegraf/src/services/__tests__/dynamic-listeners-explorer.service.spec.ts` (modify tests)

## Implementation Steps (TDD: Red-Green-Refactor)

### 1. Red Phase
- [x] Add tests for composer registration:
  ```typescript
  describe('Composer Registration', () => {
    it('discovers @Composer decorated classes from shared handler modules', () => {
      @Composer()
      class TestComposer {}

      setupModuleMock([TestComposer])

      const composers = service['filterComposers'](mockWrapper)
      expect(composers).toBeDefined()
    })

    it('registers @Composer classes as stage middlewares', () => {
      @Composer()
      class GuardComposer {
        @Use()
        onUse(@Ctx() ctx, @Next() next) { next() }
      }

      setupModuleMock([GuardComposer])

      service.registerHandlers(mockBot, 1, mockStage, null)

      expect(mockStage.use).toHaveBeenCalled()
    })
  })
  ```
- [x] Run tests - confirm failures

### 2. Green Phase
- [x] Implement `filterComposers()`:
  ```typescript
  private filterComposers(
    wrapper: InstanceWrapper
  ): InstanceWrapper<unknown> | undefined {
    const { instance } = wrapper
    if (!instance) return undefined

    const isComposer = this.metadataAccessor.isComposer(
      wrapper.metatype as Function
    )
    return isComposer ? wrapper : undefined
  }
  ```
- [x] Implement `registerComposers()`:
  ```typescript
  private registerComposers(
    modules: Module[],
    stage: Scenes.Stage<Scenes.SceneContext>
  ): void {
    const composers = this.flatMap<InstanceWrapper>(modules, (instance) =>
      this.filterComposers(instance)
    )

    for (const wrapper of composers) {
      const composer = new Composer()
      this.registerListeners(composer, wrapper)
      stage.use(composer)
    }
  }
  ```

### 3. Refactor Phase
- [x] Ensure proper Composer instantiation
- [x] Run tests - confirm passing
- [x] Run build to verify compilation

## Test Cases

| Test | Description | Status |
|------|-------------|--------|
| "discovers @Composer decorated classes" | Composer discovery | Pass |
| "registers @Composer as stage middlewares" | Middleware registration | Pass |

## Completion Criteria
- [x] `filterComposers()` identifies @Composer decorated classes
- [x] `registerComposers()` creates Composer instances
- [x] Composers registered as stage middlewares via `stage.use()`
- [x] Related unit tests pass
- [x] `npm run build` passes

## Verification Commands
```bash
npm run test -- libs/telegraf/src/services/__tests__/dynamic-listeners-explorer.service.spec.ts --grep "Composer"
npm run build
```

## Notes
- Impact scope: DynamicListenersExplorerService
- Constraints: Composers are applied as stage-level middlewares
- This allows guard/logging middleware patterns in scenes
