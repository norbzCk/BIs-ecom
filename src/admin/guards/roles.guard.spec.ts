import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard.js';

function buildContext(role: 'CUSTOMER' | 'ADMIN') {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({ user: { sub: '1', email: 'a@b.com', role } }),
    }),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  it('allows the request through when no roles are required', () => {
    const reflector = { getAllAndOverride: vi.fn().mockReturnValue(undefined) };
    const guard = new RolesGuard(reflector as unknown as Reflector);

    expect(guard.canActivate(buildContext('CUSTOMER'))).toBe(true);
  });

  it('allows a user whose role is in the required list', () => {
    const reflector = { getAllAndOverride: vi.fn().mockReturnValue(['ADMIN']) };
    const guard = new RolesGuard(reflector as unknown as Reflector);

    expect(guard.canActivate(buildContext('ADMIN'))).toBe(true);
  });

  it("rejects a user whose role isn't in the required list", () => {
    const reflector = { getAllAndOverride: vi.fn().mockReturnValue(['ADMIN']) };
    const guard = new RolesGuard(reflector as unknown as Reflector);

    expect(() => guard.canActivate(buildContext('CUSTOMER'))).toThrow(
      ForbiddenException,
    );
  });
});
