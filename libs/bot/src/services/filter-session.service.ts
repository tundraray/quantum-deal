import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

export type ScreenType =
  | 'main'
  | 'forex_list'
  | 'commodities_list'
  | 'crypto_list'
  | 'stocks_subgroups'
  | 'european_stocks'
  | 'us_stocks'
  | 'confirmation'
  | 'help';

export interface FilterSessionState {
  userId: number;
  sessionId: string;

  // Original state from database
  originalFilters: Set<string>;

  // Working copy (modified during session)
  sessionFilters: Set<string>;

  // Navigation state
  currentScreen: ScreenType;
  currentPage: number;
  breadcrumb: string[];

  // Metadata
  isDirty: boolean;
  createdAt: Date;
  lastModified: Date;
}

/**
 * FilterSessionService
 *
 * Manages in-memory session state for instrument filtering.
 * Sessions auto-expire after 15 minutes of inactivity.
 */
@Injectable()
export class FilterSessionService {
  private readonly logger = new Logger(FilterSessionService.name);
  private readonly sessions = new Map<number, FilterSessionState>();
  private readonly sessionTimeouts = new Map<number, NodeJS.Timeout>();
  private readonly SESSION_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes

  /**
   * Initialize a new session for user
   *
   * @param userId - Telegram user ID
   * @param currentFilters - User's current filters from database
   */
  initializeSession(userId: number, currentFilters: string[]): void {
    // Clear any existing session and timeout
    this.clearSession(userId);

    const filterSet = new Set(currentFilters);

    const session: FilterSessionState = {
      userId,
      sessionId: uuidv4(),
      originalFilters: new Set(filterSet),
      sessionFilters: new Set(filterSet),
      currentScreen: 'main',
      currentPage: 0,
      breadcrumb: ['main'],
      isDirty: false,
      createdAt: new Date(),
      lastModified: new Date(),
    };

    this.sessions.set(userId, session);
    this.resetTimeout(userId);

    this.logger.debug(
      `Initialized session ${session.sessionId} for user ${userId}`,
    );
  }

  /**
   * Get session state for user
   *
   * @param userId - Telegram user ID
   * @returns Session state or null if not found
   */
  getSession(userId: number): FilterSessionState | null {
    const session = this.sessions.get(userId);
    if (session) {
      this.resetTimeout(userId); // Reset timeout on access
      return session;
    }
    return null;
  }

  /**
   * Update navigation state
   *
   * @param userId - Telegram user ID
   * @param screen - New screen type
   * @param page - Page number (default 0)
   */
  updateNavigation(userId: number, screen: ScreenType, page: number = 0): void {
    const session = this.sessions.get(userId);
    if (!session) {
      this.logger.warn(`Session not found for user ${userId}`);
      return;
    }

    session.currentScreen = screen;
    session.currentPage = page;
    session.lastModified = new Date();

    this.resetTimeout(userId);
  }

  /**
   * Update breadcrumb trail
   *
   * @param userId - Telegram user ID
   * @param breadcrumb - New breadcrumb array
   */
  updateBreadcrumb(userId: number, breadcrumb: string[]): void {
    const session = this.sessions.get(userId);
    if (!session) return;

    session.breadcrumb = breadcrumb;
    session.lastModified = new Date();
  }

  /**
   * Toggle instrument selection
   *
   * @param userId - Telegram user ID
   * @param symbol - Instrument symbol
   */
  toggleInstrument(userId: number, symbol: string): void {
    const session = this.sessions.get(userId);
    if (!session) {
      this.logger.warn(`Session not found for user ${userId}`);
      return;
    }

    if (session.sessionFilters.has(symbol)) {
      session.sessionFilters.delete(symbol);
    } else {
      session.sessionFilters.add(symbol);
    }

    session.isDirty = !this.areSetsEqual(
      session.originalFilters,
      session.sessionFilters,
    );
    session.lastModified = new Date();

    this.resetTimeout(userId);
  }

  /**
   * Select all instruments in a list
   *
   * @param userId - Telegram user ID
   * @param symbols - Array of symbols to select
   */
  selectAll(userId: number, symbols: string[]): void {
    const session = this.sessions.get(userId);
    if (!session) return;

    for (const symbol of symbols) {
      session.sessionFilters.add(symbol);
    }

    session.isDirty = !this.areSetsEqual(
      session.originalFilters,
      session.sessionFilters,
    );
    session.lastModified = new Date();

    this.resetTimeout(userId);
  }

  /**
   * Deselect all instruments in a list
   *
   * @param userId - Telegram user ID
   * @param symbols - Array of symbols to deselect
   */
  deselectAll(userId: number, symbols: string[]): void {
    const session = this.sessions.get(userId);
    if (!session) return;

    for (const symbol of symbols) {
      session.sessionFilters.delete(symbol);
    }

    session.isDirty = !this.areSetsEqual(
      session.originalFilters,
      session.sessionFilters,
    );
    session.lastModified = new Date();

    this.resetTimeout(userId);
  }

  /**
   * Clear all selections (reset to empty = all instruments)
   *
   * @param userId - Telegram user ID
   */
  clearAllSelections(userId: number): void {
    const session = this.sessions.get(userId);
    if (!session) return;

    session.sessionFilters.clear();
    session.isDirty = !this.areSetsEqual(
      session.originalFilters,
      session.sessionFilters,
    );
    session.lastModified = new Date();

    this.resetTimeout(userId);
  }

  /**
   * Discard changes and restore original filters
   *
   * @param userId - Telegram user ID
   */
  discardChanges(userId: number): void {
    const session = this.sessions.get(userId);
    if (!session) return;

    session.sessionFilters = new Set(session.originalFilters);
    session.isDirty = false;
    session.lastModified = new Date();
  }

  /**
   * Commit session changes (update original filters)
   *
   * Called after successful save to database.
   *
   * @param userId - Telegram user ID
   */
  commitChanges(userId: number): void {
    const session = this.sessions.get(userId);
    if (!session) return;

    session.originalFilters = new Set(session.sessionFilters);
    session.isDirty = false;
    session.lastModified = new Date();
  }

  /**
   * Clear session and cancel timeout
   *
   * @param userId - Telegram user ID
   */
  clearSession(userId: number): void {
    this.sessions.delete(userId);

    const timeout = this.sessionTimeouts.get(userId);
    if (timeout) {
      clearTimeout(timeout);
      this.sessionTimeouts.delete(userId);
    }

    this.logger.debug(`Cleared session for user ${userId}`);
  }

  /**
   * Check if session exists
   *
   * @param userId - Telegram user ID
   * @returns true if session exists
   */
  hasSession(userId: number): boolean {
    return this.sessions.has(userId);
  }

  /**
   * Get all active session count (for monitoring)
   */
  getActiveSessionCount(): number {
    return this.sessions.size;
  }

  /**
   * Reset session timeout
   *
   * @param userId - Telegram user ID
   */
  private resetTimeout(userId: number): void {
    // Clear existing timeout
    const existingTimeout = this.sessionTimeouts.get(userId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Set new timeout
    const timeout = setTimeout(() => {
      this.logger.debug(`Session timeout for user ${userId}`);
      this.clearSession(userId);
    }, this.SESSION_TIMEOUT_MS);

    this.sessionTimeouts.set(userId, timeout);
  }

  /**
   * Compare two sets for equality
   */
  private areSetsEqual(set1: Set<string>, set2: Set<string>): boolean {
    if (set1.size !== set2.size) return false;
    for (const item of set1) {
      if (!set2.has(item)) return false;
    }
    return true;
  }
}
