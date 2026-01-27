/**
 * Signal Batching Module
 *
 * In-memory buffer with per-bot independent timers for signal consolidation.
 * Per ADR-011: Consolidates signals within batch window (default 5s) into single notification.
 *
 * @module batching
 * @see docs/design/signal-batching-design.md v1.4
 * @see docs/adr/ADR-011-signal-batching.md
 */

export * from './signal-batching.interface';
export * from './signal-batching.service';
export * from './template-engine';
export * from './batch-message-formatter.service';
