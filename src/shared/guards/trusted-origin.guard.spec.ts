import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { TrustedOriginGuard } from './trusted-origin.guard';

const contextFor = (req: {
  method: string;
  headers: Record<string, string>;
}): ExecutionContext =>
  ({
    switchToHttp: () => ({ getRequest: () => req }),
  }) as unknown as ExecutionContext;

describe('TrustedOriginGuard', () => {
  const guard = new TrustedOriginGuard();
  const originalFrontend = process.env.FRONTEND_URL;

  beforeAll(() => {
    process.env.FRONTEND_URL = 'https://vtg.example';
  });

  afterAll(() => {
    process.env.FRONTEND_URL = originalFrontend;
  });

  it.each([
    ['the frontend', { origin: 'https://vtg.example', host: 'api.vtg.example' }],
    ['the API itself (Swagger)', { origin: 'https://api.vtg.example', host: 'api.vtg.example' }],
    ['a non-browser client', { host: 'api.vtg.example' }],
  ])('lets %s change things', (_label, headers) => {
    expect(guard.canActivate(contextFor({ method: 'POST', headers }))).toBe(true);
  });

  it('refuses a form posted from a sibling site', () => {
    expect(() =>
      guard.canActivate(
        contextFor({
          method: 'POST',
          headers: { origin: 'https://evil.vtg.example', host: 'api.vtg.example' },
        }),
      ),
    ).toThrow(ForbiddenException);
  });

  it('does not restrict reads', () => {
    expect(
      guard.canActivate(
        contextFor({
          method: 'GET',
          headers: { origin: 'https://evil.vtg.example', host: 'api.vtg.example' },
        }),
      ),
    ).toBe(true);
  });
});
