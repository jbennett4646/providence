/*
 * A small in-process limit on failed sign-ins per key (email or username),
 * enough to slow password guessing on a single server. A deployment with
 * several servers should move this to the database or a shared store.
 */

const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 8;

const failures = new Map<string, { count: number; first: number }>();

export function isLocked(key: string, now = Date.now()): boolean {
  const f = failures.get(key);
  if (!f) return false;
  if (now - f.first > WINDOW_MS) {
    failures.delete(key);
    return false;
  }
  return f.count >= MAX_FAILURES;
}

export function recordFailure(key: string, now = Date.now()) {
  const f = failures.get(key);
  if (!f || now - f.first > WINDOW_MS) failures.set(key, { count: 1, first: now });
  else f.count++;
}

export function clearFailures(key: string) {
  failures.delete(key);
}
