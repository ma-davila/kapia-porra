// Retry an async operation a few times with linear backoff. Used to absorb
// transient failures — notably Neon's free-tier "scale to zero" cold start,
// where the first DB call after idle can fail/timeout, and brief API hiccups.
export async function retry<T>(
  fn: () => Promise<T>,
  attempts = 3,
  delayMs = 1500,
): Promise<T> {
  let last: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      if (i < attempts - 1) {
        await new Promise((r) => setTimeout(r, delayMs * (i + 1)));
      }
    }
  }
  throw last;
}
