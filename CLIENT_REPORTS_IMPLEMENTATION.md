# Client-Specific Weekly Report Implementation

This document describes the implementation of client-specific weekly report generation with sector filtering in the WeekReportService.

## Overview

The WeekReportService has been enhanced to support personalized weekly reports for individual clients based on their subscription's sector preferences. The service now generates both aggregate reports (for internal use) and personalized reports (sent directly to clients).

## Key Features

### 1. Client-Specific Report Generation
- **Individual Reports**: Each active client with a valid subscription receives a personalized report
- **Sector Filtering**: Trading data is filtered based on the client's subscription scope
- **Personalized Content**: Reports include the client's name and subscription details

### 2. Subscription Scope Support
The service supports multiple subscription scope formats:
- **All Sectors**: `"*"` or `{"sectors": "*"}` or `{"*": true}`
- **Specific Sectors**: `["forex", "crypto"]` or `{"sectors": ["forex", "crypto"]}`
- **Single Sector**: `"forex"` or `{"sectors": "forex"}`
- **Object Format**: `{"forex": true, "crypto": true}`

### 3. Automatic Scheduling
- Runs every Sunday at 19:00 UTC+3 (Moscow Time)
- Generates aggregate report first, then individual client reports
- Sends personalized reports via Telegram bot if available

## New Interfaces

### `ClientSubscription`
Represents a client with their subscription details.

### `ClientWeeklyReportData`
Extends the base report data with client-specific information and filtered trading activity.

### `ClientReportResult`
Contains the results of the client report generation process.

## New Methods

### `generateClientWeeklyReports(period?, bot?)`
Main method that generates reports for all active clients.

**Parameters:**
- `period`: ReportPeriod (default: LAST_WEEK)
- `bot`: Optional Telegraf bot instance for sending reports

**Returns:** `Promise<ClientReportResult>`

### `getActiveClientsWithSubscriptions()`
Retrieves all clients with valid, non-expired subscriptions.

### `generateClientReport(client, period, bot?)`
Generates a personalized report for a specific client.

### `gatherClientTradingActivityData(startDate, endDate, subscriptionScope)`
Filters trading data based on the client's subscription scope.

### `extractAllowedSectors(subscriptionScope)`
Parses the subscription scope and returns allowed sectors.

### `sendClientReport(clientReport, bot)`
Sends a personalized report to a client via Telegram.

### `formatClientReport(data)`
Formats client-specific report data into a human-readable message.

## Usage Examples

### Manual Report Generation
```typescript
// Generate reports for all clients for the last week
const result = await weekReportService.generateClientWeeklyReports();
console.log(`Generated ${result.successfulReports} reports for ${result.processedClients} clients`);

// Generate reports with bot integration for sending
const result = await weekReportService.generateClientWeeklyReports(ReportPeriod.LAST_WEEK, bot);
```

### Custom Period Reports
```typescript
// Generate reports for the current week
await weekReportService.generateClientWeeklyReports(ReportPeriod.CURRENT_WEEK, bot);
```

## Report Content

Each personalized report includes:
- **Personal Greeting**: Uses client's name from subscription
- **Trading Performance**: Filtered by their subscription sectors
  - Total orders
  - Success rate
  - Profit/loss metrics
  - Volume statistics
- **Subscription Info**: Current plan, covered sectors, expiration date
- **Performance Score**: Individual performance rating

## Sample Report Format

```
📊 Your Personal Weekly Trading Report

Hello John Doe! Here's your personalized trading summary:

📈 Your Trading Activity
• Total Orders: 15
• Closed Orders: 12
• Profitable Orders: 8
• Success Rate: 66.7%
• Total Profit: $1,245.67
• Total Volume: 2.5 lots

🎯 Your Subscription
• Plan: Premium Forex Plan
• Covered Sectors: forex, indices
• Valid Until: Dec 31, 2024

⭐ Performance Score
• Your Score: 67/100
• Net Profit: $1,045.67

Thank you for being a valued subscriber!
```

## Error Handling

The service includes comprehensive error handling:
- Database connection issues
- Invalid subscription data
- Telegram API failures
- Missing client information

Errors are logged and reported in the `ClientReportResult` for monitoring purposes.

## Integration with Existing Workflows

- **Scheduled Execution**: Automatically runs with existing weekly report schedule
- **Database Compatibility**: Uses existing repositories and schema
- **Type Safety**: Fully typed with TypeScript interfaces
- **Clean Architecture**: Follows NestJS and clean code principles

## Performance Considerations

- **Parallel Processing**: Client reports are generated concurrently
- **Database Optimization**: Efficient queries with proper indexing
- **Rate Limiting**: Telegram message sending is rate-limited
- **Memory Efficient**: Processes clients in batches to avoid memory issues

## Configuration

No additional configuration is required. The service uses existing:
- Database connections
- Repository instances  
- Notification service
- Scheduling configuration

The service gracefully handles missing dependencies and continues operation even if optional services (like Telegram bot) are unavailable.