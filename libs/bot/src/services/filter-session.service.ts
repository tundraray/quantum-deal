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
   * @param botUserId - Bot user ID
   * @param currentFilters - User's current filters from database
   */
  initializeSession(botUserId: number, currentFilters: string[]): void {
    // Clear any existing session and timeout
    this.clearSession(botUserId);

    const filterSet = new Set(currentFilters);

    const session: FilterSessionState = {
      userId: botUserId,
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

    this.sessions.set(botUserId, session);
    this.resetTimeout(botUserId);

    this.logger.debug(
      `Initialized session ${session.sessionId} for user ${botUserId}`,
    );
  }

  /**
   * Get session state for user
   *
   * @param botUserId - Bot user ID
   * @returns Session state or null if not found
   */
  getSession(botUserId: number): FilterSessionState | null {
    const session = this.sessions.get(botUserId);
    if (session) {
      this.resetTimeout(botUserId); // Reset timeout on access
      return session;
    }
    return null;
  }

  /**
   * Update navigation state
   *
   * @param botUserId - Bot user ID
   * @param screen - New screen type
   * @param page - Page number (default 0)
   */
  updateNavigation(
    botUserId: number,
    screen: ScreenType,
    page: number = 0,
  ): void {
    const session = this.sessions.get(botUserId);
    if (!session) {
      this.logger.warn(`Session not found for user ${botUserId}`);
      return;
    }

    session.currentScreen = screen;
    session.currentPage = page;
    session.lastModified = new Date();

    this.resetTimeout(botUserId);
  }

  /**
   * Update breadcrumb trail
   *
   * @param botUserId - Bot user ID
   * @param breadcrumb - New breadcrumb array
   */
  updateBreadcrumb(botUserId: number, breadcrumb: string[]): void {
    const session = this.sessions.get(botUserId);
    if (!session) return;

    session.breadcrumb = breadcrumb;
    session.lastModified = new Date();
  }

  /**
   * Toggle instrument selection
   *
   * @param botUserId - Bot user ID
   * @param symbol - Instrument symbol
   */
  toggleInstrument(botUserId: number, symbol: string): void {
    const session = this.sessions.get(botUserId);
    if (!session) {
      this.logger.warn(`Session not found for user ${botUserId}`);
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

    this.resetTimeout(botUserId);
  }

  /**
   * Select all instruments in a list
   *
   * @param botUserId - Bot user ID
   * @param symbols - Array of symbols to select
   */
  selectAll(botUserId: number, symbols: string[]): void {
    const session = this.sessions.get(botUserId);
    if (!session) return;

    for (const symbol of symbols) {
      session.sessionFilters.add(symbol);
    }

    session.isDirty = !this.areSetsEqual(
      session.originalFilters,
      session.sessionFilters,
    );
    session.lastModified = new Date();

    this.resetTimeout(botUserId);
  }

  /**
   * Deselect all instruments in a list
   *
   * @param botUserId - Bot user ID
   * @param symbols - Array of symbols to deselect
   */
  deselectAll(botUserId: number, symbols: string[]): void {
    const session = this.sessions.get(botUserId);
    if (!session) return;

    for (const symbol of symbols) {
      session.sessionFilters.delete(symbol);
    }

    session.isDirty = !this.areSetsEqual(
      session.originalFilters,
      session.sessionFilters,
    );
    session.lastModified = new Date();

    this.resetTimeout(botUserId);
  }

  /**
   * Clear all selections (reset to empty = all instruments)
   *
   * @param botUserId - Bot user ID
   */
  clearAllSelections(botUserId: number): void {
    const session = this.sessions.get(botUserId);
    if (!session) return;

    session.sessionFilters.clear();
    session.isDirty = !this.areSetsEqual(
      session.originalFilters,
      session.sessionFilters,
    );
    session.lastModified = new Date();

    this.resetTimeout(botUserId);
  }

  /**
   * Discard changes and restore original filters
   *
   * @param botUserId - Bot user ID
   */
  discardChanges(botUserId: number): void {
    const session = this.sessions.get(botUserId);
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
   * @param botUserId - Bot user ID
   */
  commitChanges(botUserId: number): void {
    const session = this.sessions.get(botUserId);
    if (!session) return;

    session.originalFilters = new Set(session.sessionFilters);
    session.isDirty = false;
    session.lastModified = new Date();
  }

  /**
   * Clear session and cancel timeout
   *
   * @param botUserId - Bot user ID
   */
  clearSession(botUserId: number): void {
    this.sessions.delete(botUserId);

    const timeout = this.sessionTimeouts.get(botUserId);
    if (timeout) {
      clearTimeout(timeout);
      this.sessionTimeouts.delete(botUserId);
    }

    this.logger.debug(`Cleared session for user ${botUserId}`);
  }

  /**
   * Check if session exists
   *
   * @param botUserId - Bot user ID
   * @returns true if session exists
   */
  hasSession(botUserId: number): boolean {
    return this.sessions.has(botUserId);
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
   * @param botUserId - Bot user ID
   */
  private resetTimeout(botUserId: number): void {
    // Clear existing timeout
    const existingTimeout = this.sessionTimeouts.get(botUserId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Set new timeout
    const timeout = setTimeout(() => {
      this.logger.debug(`Session timeout for user ${botUserId}`);
      this.clearSession(botUserId);
    }, this.SESSION_TIMEOUT_MS);

    this.sessionTimeouts.set(botUserId, timeout);
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
