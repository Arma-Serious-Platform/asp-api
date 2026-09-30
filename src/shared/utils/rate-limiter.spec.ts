import { FixedWindowRateLimiter } from './rate-limiter';

describe('FixedWindowRateLimiter', () => {
  let now: number;
  let limiter: FixedWindowRateLimiter;

  beforeEach(() => {
    now = 1_000_000;
    limiter = new FixedWindowRateLimiter(() => now);
  });

  it('allows up to the limit and rejects the next hit', () => {
    expect(limiter.hit('k', 2, 60_000).allowed).toBe(true);
    expect(limiter.hit('k', 2, 60_000).allowed).toBe(true);

    const rejected = limiter.hit('k', 2, 60_000);
    expect(rejected.allowed).toBe(false);
    expect(rejected.retryAfterMs).toBe(60_000);
  });

  it('keeps separate counters per key', () => {
    limiter.hit('a', 1, 60_000);

    expect(limiter.hit('a', 1, 60_000).allowed).toBe(false);
    expect(limiter.hit('b', 1, 60_000).allowed).toBe(true);
  });

  it('starts a new window once the previous one expires', () => {
    limiter.hit('k', 1, 60_000);
    now += 30_000;
    expect(limiter.hit('k', 1, 60_000).retryAfterMs).toBe(30_000);

    now += 30_000;
    expect(limiter.hit('k', 1, 60_000).allowed).toBe(true);
  });

  it('counts every hit synchronously, so a burst cannot exceed the limit', () => {
    const results = Array.from({ length: 20 }, () =>
      limiter.hit('burst', 5, 60_000),
    );

    expect(results.filter((result) => result.allowed)).toHaveLength(5);
  });

  it('forgets a key after reset', () => {
    limiter.hit('k', 1, 60_000);
    limiter.reset('k');

    expect(limiter.hit('k', 1, 60_000).allowed).toBe(true);
  });
});
