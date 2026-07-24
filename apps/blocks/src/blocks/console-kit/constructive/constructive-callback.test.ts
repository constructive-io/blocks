import { describe, expect, it, vi } from 'vitest';

import {
  createConstructiveCallbackCredentialVault,
  parseConstructiveConsoleCallback,
  scrubConstructiveConsoleCallbackLocation
} from './constructive-callback';

describe('Constructive Console Kit callbacks', () => {
  it('captures a tenant-bound password reset without exposing its credential', () => {
    const vault = createConstructiveCallbackCredentialVault();
    const result = parseConstructiveConsoleCallback(
      'https://tenant.example/reset-password?database_id=database-1&role_id=user-1&reset_token=reset-secret&utm_source=email',
      { databaseId: 'database-1', credentialVault: vault }
    );

    expect(result).toMatchObject({
      status: 'ready',
      callback: {
        kind: 'password-reset',
        databaseId: 'database-1',
        roleId: 'user-1'
      },
      sanitizedUrl: '/reset-password?utm_source=email'
    });
    expect(JSON.stringify(result)).not.toContain('reset-secret');
    if (result.status !== 'ready') throw new Error('Expected a ready callback.');
    expect(vault.peek(result.callback.credentialRef)).toBe('reset-secret');
    expect(vault.consume(result.callback.credentialRef)).toBe('reset-secret');
    expect(vault.status(result.callback.credentialRef)).toBe('consumed');
    expect(vault.consume(result.callback.credentialRef)).toBeUndefined();
  });

  it('accepts fragment credentials and preserves unrelated URL state', () => {
    const vault = createConstructiveCallbackCredentialVault();
    const result = parseConstructiveConsoleCallback(
      'https://tenant.example/verify-email?campaign=summer#email_id=email-1&verification_token=verify-secret&tab=profile',
      { databaseId: 'database-1', credentialVault: vault }
    );

    expect(result).toMatchObject({
      status: 'ready',
      callback: {
        kind: 'email-verification',
        databaseId: 'database-1',
        emailId: 'email-1'
      },
      sanitizedUrl: '/verify-email?campaign=summer#tab=profile'
    });
    if (result.status !== 'ready') throw new Error('Expected a ready callback.');
    expect(vault.peek(result.callback.credentialRef)).toBe('verify-secret');
  });

  it.each([
    [
      'account deletion',
      'https://tenant.example/delete-account?user_id=user-1&account_deletion_token=delete-secret',
      { kind: 'account-deletion', userId: 'user-1' },
      'delete-secret'
    ],
    [
      'application invite',
      'https://tenant.example/register?type=app&invite_token=app-secret',
      { kind: 'app-invite' },
      'app-secret'
    ],
    [
      'organization invite',
      'https://tenant.example/register?type=org&invite_token=org-secret',
      { kind: 'organization-invite' },
      'org-secret'
    ]
  ])('parses a %s callback', (_label, source, callback, credential) => {
    const vault = createConstructiveCallbackCredentialVault();
    const result = parseConstructiveConsoleCallback(source, {
      databaseId: 'database-1',
      credentialVault: vault
    });

    expect(result).toMatchObject({ status: 'ready', callback });
    if (result.status !== 'ready') throw new Error('Expected a ready callback.');
    expect(result.callback.databaseId).toBe('database-1');
    expect(vault.peek(result.callback.credentialRef)).toBe(credential);
  });

  it('rejects an explicit callback from another tenant before vaulting it', () => {
    const vault = createConstructiveCallbackCredentialVault();
    const result = parseConstructiveConsoleCallback(
      'https://tenant.example/reset-password?database_id=database-2&role_id=user-1&reset_token=secret',
      { databaseId: 'database-1', credentialVault: vault }
    );

    expect(result).toEqual({
      status: 'cross-tenant',
      kind: 'password-reset',
      expectedDatabaseId: 'database-1',
      callbackDatabaseId: 'database-2',
      message: 'This callback belongs to a different tenant database.',
      sanitizedUrl: '/reset-password'
    });
    expect(JSON.stringify(result)).not.toContain('secret');
  });

  it('reports incomplete and conflicting callbacks without retaining secrets', () => {
    const vault = createConstructiveCallbackCredentialVault();
    const incomplete = parseConstructiveConsoleCallback(
      'https://tenant.example/verify-email?verification_token=secret',
      { databaseId: 'database-1', credentialVault: vault }
    );
    const conflicting = parseConstructiveConsoleCallback(
      'https://tenant.example/reset-password?role_id=user-1&reset_token=one#reset_token=two',
      { databaseId: 'database-1', credentialVault: vault }
    );

    expect(incomplete).toMatchObject({
      status: 'incomplete',
      kind: 'email-verification',
      missing: ['email_id']
    });
    expect(conflicting).toMatchObject({ status: 'invalid' });
    expect(JSON.stringify([incomplete, conflicting])).not.toMatch(/secret|one|two/u);
  });

  it('does not reinterpret or scrub unrelated URL parameters', () => {
    const vault = createConstructiveCallbackCredentialVault();
    const result = parseConstructiveConsoleCallback(
      'https://tenant.example/settings?user_id=user-1&token=host-owned',
      { databaseId: 'database-1', credentialVault: vault }
    );

    expect(result).toEqual({ status: 'none' });
  });

  it('replaces a browser URL only with the sanitized callback URL', () => {
    const vault = createConstructiveCallbackCredentialVault();
    const result = parseConstructiveConsoleCallback(
      'https://tenant.example/register?type=app&invite_token=secret&campaign=launch',
      { databaseId: 'database-1', credentialVault: vault }
    );
    const replaceState = vi.fn();

    scrubConstructiveConsoleCallbackLocation(
      result,
      {
        pathname: '/register',
        search: '?type=app&invite_token=secret&campaign=launch',
        hash: ''
      },
      { state: { preserved: true }, replaceState }
    );

    expect(replaceState).toHaveBeenCalledWith(
      { preserved: true },
      '',
      '/register?campaign=launch'
    );
  });
});
