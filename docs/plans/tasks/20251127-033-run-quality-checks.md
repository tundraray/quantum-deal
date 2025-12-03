# Task: Run Quality Checks

Metadata:
- Phase: 5 (Quality Assurance)
- Dependencies: Task 20251127-032 (integration tests pass)
- Provides: Code quality verification
- Size: Small (verification task)
- Verification Level: L1 (All Checks Pass)

## Implementation Content
Execute all quality checks including linting, formatting, unused export detection, and TypeScript build to ensure code meets project standards.

Design Doc Reference: Section "Phase 5: Quality Assurance"

## Target Files
- All files in `libs/telegraf/src/`

## Implementation Steps

### 1. Run Biome Lint + Format Check
```bash
npm run check
```

**Expected**: No errors, no warnings

### 2. Run Unused Export Check
```bash
npm run check:unused
```

**Expected**: No unused exports in new files

### 3. Run TypeScript Build
```bash
npm run build
```

**Expected**: Build succeeds with no errors

### 4. Fix Any Issues Found
- [ ] Lint errors: Fix code style issues
- [ ] Format errors: Run `npm run format` if needed
- [ ] Unused exports: Remove or export as needed
- [ ] Type errors: Fix TypeScript issues

## Quality Checks Summary

| Check | Command | Expected |
|-------|---------|----------|
| Lint + Format | `npm run check` | 0 errors |
| Unused Exports | `npm run check:unused` | 0 unused |
| TypeScript Build | `npm run build` | Success |

## Completion Criteria
- [ ] `npm run check` passes with 0 errors
- [ ] `npm run check:unused` shows no unused exports in new files
- [ ] `npm run build` completes successfully
- [ ] No type errors in any new files

## Verification Commands
```bash
npm run check && npm run check:unused && npm run build
```

## Notes
- Impact scope: May require code formatting or lint fixes
- All new code must meet existing project quality standards
- This ensures the implementation is production-ready
