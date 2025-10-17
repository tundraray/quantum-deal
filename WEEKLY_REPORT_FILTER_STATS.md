# Weekly Report: Instrument Filter Statistics

## Overview

This document describes the implementation of instrument filter statistics in weekly reports for VIP users with the `CUSTOM_USER_FILTERING` feature flag.

## Feature Description

VIP users with custom instrument filtering can now see statistics about signals they missed due to their filter settings in their weekly reports. This helps users:
- Understand how their filters affect signal coverage
- Identify which instruments they're missing out on
- Make informed decisions about expanding their filters

## Implementation Details

### 1. Data Structures

#### FilteredInstrumentsStats Interface
```typescript
interface FilteredInstrumentsStats {
  readonly totalFilteredOrders: number;        // Total signals missed due to filters
  readonly filteredPercentage: number;         // Percentage of missed signals
  readonly topMissedInstruments: ReadonlyArray<{
    readonly symbol: string;                   // Instrument symbol
    readonly count: number;                    // Number of missed signals
  }>;                                          // Top 3 most missed instruments
}
```

#### Updated TradingActivityStats
```typescript
interface TradingActivityStats {
  // ... existing fields
  readonly filteredByInstruments?: FilteredInstrumentsStats; // Optional, only for VIP
}
```

### 2. Service Architecture

#### WeekReportService Updates

**New Dependencies:**
- `SubscriptionFeaturesRepository` - Check if user has CUSTOM_USER_FILTERING feature
- `InstrumentFilterService` - Get user's instrument filters

**Key Methods:**

1. **`calculateFilteredInstrumentsStats(userId, allOrdersInSectors)`**
   - Checks if user has `CUSTOM_USER_FILTERING` feature
   - Retrieves user's instrument filters
   - Calculates missed signals statistics
   - Returns top 3 most missed instruments
   - Returns `undefined` if feature not enabled or no filters

2. **`applyInstrumentFilters(userId, orders)`**
   - Applies user's instrument filters to orders
   - Returns filtered orders or all orders if no filters

3. **`gatherClientTradingActivityData(userId, startDate, endDate, subscriptionScope)`**
   - Updated to accept `userId` parameter
   - Calls `calculateFilteredInstrumentsStats` for filter statistics
   - Calls `applyInstrumentFilters` to get final user orders
   - Includes filter statistics in returned data

4. **`formatClientWeeklyReport(data)`**
   - Updated to replace filter statistics placeholders
   - Handles cases where filter stats are undefined
   - Includes filter statistics in fallback template

### 3. Message Template Placeholders

New placeholders available in weekly report templates:

| Placeholder | Description | Example |
|------------|-------------|---------|
| `{filtered_orders_count}` | Number of missed signals | `30` |
| `{filtered_percentage}` | Percentage of missed signals | `67` |
| `{top_missed_1}` | Top missed instrument #1 symbol | `EURUSD.a` |
| `{top_missed_count_1}` | Top missed instrument #1 count | `12` |
| `{top_missed_2}` | Top missed instrument #2 symbol | `GOLD.a` |
| `{top_missed_count_2}` | Top missed instrument #2 count | `8` |
| `{top_missed_3}` | Top missed instrument #3 symbol | `BTCUSD.a` |
| `{top_missed_count_3}` | Top missed instrument #3 count | `6` |

### 4. Database Migration

Migration file: `libs/db/migrations/20251018011730_add_weekly_report_filter_stats.sql`

Creates weekly report templates for VIP users (subscription_id = 3) in 8 languages:
- English (en)
- Russian (ru)
- Spanish (es)
- French (fr)
- German (de)
- Italian (it)
- Portuguese (pt)
- Chinese (zh)

## User Experience

### For VIP Users WITHOUT Filters (All Instruments Selected)
No filter statistics section is shown in the report. They receive the standard weekly report with their trading statistics and VIP reference data.

### For VIP Users WITH Filters
Weekly report includes an additional section:

```
📊 Filter Statistics
You missed 30 signals (67%) due to your instrument filters.

Top missed instruments:
💱 EURUSD.a: 12 signals
🛢️ GOLD.a: 8 signals
💰 BTCUSD.a: 6 signals

💡 Tip: Consider expanding your filters via /filter to receive more signals
```

### For Basic Users
No filter statistics are shown, as they don't have the `CUSTOM_USER_FILTERING` feature.

## Configuration

### Feature Flags
- **CUSTOM_USER_FILTERING** - Required for filter statistics
  - Only available for VIP subscription (id=3)
  - Enables user-configurable instrument filtering
  - Enables filter statistics in weekly reports

### Subscription Settings
User instrument filters are stored in:
- Table: `user_subscription_features`
- Field: `settings.symbols` (JSONB array of strings)
- Empty array = all instruments (no filtering)

## Testing Scenarios

### Scenario 1: VIP User with Filters
```
Given: VIP user with filters enabled
  And: User selected 5 out of 20 instruments
  And: 45 signals occurred in the week
When: Weekly report is generated
Then: Report shows:
  - 15 received signals (for selected instruments)
  - 30 missed signals (67%)
  - Top 3 missed instruments with counts
```

### Scenario 2: VIP User without Filters
```
Given: VIP user with no filters (all instruments selected)
When: Weekly report is generated
Then: Report shows:
  - All signals received
  - No filter statistics section
```

### Scenario 3: Basic User
```
Given: Basic user (no CUSTOM_USER_FILTERING feature)
When: Weekly report is generated
Then: Report shows:
  - Signals for their tier (sector-based filtering)
  - VIP reference data (what they're missing)
  - No instrument filter statistics
```

## Error Handling

The implementation includes comprehensive error handling:

1. **Feature Check Failure**
   - Gracefully returns `undefined` for filter stats
   - Logs error but continues report generation

2. **Filter Retrieval Failure**
   - Returns all orders (no filtering)
   - Logs error for debugging

3. **Template Placeholder Failure**
   - Replaces missing placeholders with defaults (`0`, `-`)
   - Includes fallback template with filter stats

## Performance Considerations

1. **Database Queries**
   - Single query to check feature flag
   - Single query to get user filters
   - Orders already retrieved for report generation

2. **Memory Usage**
   - Filters orders in-memory using Set for O(1) lookup
   - Minimal additional memory for statistics calculation

3. **Processing Time**
   - Negligible overhead (~1-2ms per user)
   - Runs asynchronously with other report generation

## Future Enhancements

Potential improvements for future iterations:

1. **Historical Trends**
   - Track filter effectiveness over time
   - Show "You missed X% less than last week"

2. **Smart Recommendations**
   - Analyze which instruments would improve results
   - "Adding EURUSD would have given you +$500"

3. **Filter Presets**
   - "Conservative: 10 most stable instruments"
   - "Aggressive: 25 high-volatility instruments"

4. **Interactive Filter Adjustment**
   - Inline buttons to add/remove top missed instruments
   - One-click filter expansion

## Related Documentation

- [Feature Flags System](./docs/feature-flags/README.md)
- [Custom User Filtering](./docs/bot-commands/filter.md)
- [Weekly Report Implementation](./CLIENT_REPORTS_IMPLEMENTATION.md)
- [Instrument Filter Service](./libs/bot/src/services/instrument-filter.service.ts)

## Migration Instructions

### Applying the Migration

```bash
# Run database migration
pnpm run db:push

# Or manually apply SQL
psql -d quantum_deal -f libs/db/migrations/20251018011730_add_weekly_report_filter_stats.sql
```

### Verifying the Migration

```sql
-- Check if templates were created
SELECT lang, type
FROM messages
WHERE type = 'weekly_report_3'
ORDER BY lang;

-- Should return 8 rows (one per language)
```

### Customizing Templates

Templates can be customized per language:

```sql
-- Update English template
UPDATE messages
SET message = 'Your custom template with {filtered_orders_count} placeholder...'
WHERE type = 'weekly_report_3' AND lang = 'en';
```

## Support

For issues or questions:
1. Check logs for error messages (search for "Failed to calculate filtered instruments stats")
2. Verify feature flag is enabled for user: `SELECT * FROM subscription_features WHERE feature_key = 'custom_user_filtering'`
3. Check user filters: `SELECT * FROM user_subscription_features WHERE feature_key = 'custom_user_filtering'`
4. Review migration status: `SELECT * FROM messages WHERE type = 'weekly_report_3'`
