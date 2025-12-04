/**
 * Options for retry with backoff
 */
export interface RetryOptions {
  /** Maximum number of retry attempts */
  maxRetries: number;
  /** Delays in milliseconds between retries */
  delays: number[];
}

const DEFAULT_OPTIONS: RetryOptions = {
  maxRetries: 3,
  delays: [1000, 2000, 4000],
};

/**
 * Sleeps for the specified duration
 * @param ms - Duration in milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retries a function with exponential backoff
 * @param fn - Async function to retry
 * @param options - Retry options
 * @returns Promise resolving to function result
 * @throws Last error if all retries fail
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = DEFAULT_OPTIONS,
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= options.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < options.maxRetries) {
        const delay =
          options.delays[attempt] ?? options.delays[options.delays.length - 1];
        await sleep(delay);
      }
    }
  }

  throw lastError ?? new Error('All retry attempts failed');
}
