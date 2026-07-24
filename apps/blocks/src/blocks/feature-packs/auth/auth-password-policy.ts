import type { AuthPasswordPolicy } from './auth-contracts';

export function normalizedPasswordLength(
  value: number | undefined
): number | undefined {
  if (!Number.isFinite(value) || !value || value < 1) return undefined;
  return Math.floor(value);
}

export function authPasswordHint(
  password: string,
  policy: AuthPasswordPolicy | undefined
): string | undefined {
  const minLength = normalizedPasswordLength(policy?.minLength);
  const maxLength = normalizedPasswordLength(policy?.maxLength);
  if (password && minLength && password.length < minLength) {
    return `Use at least ${minLength} characters (${password.length} so far).`;
  }
  if (password && maxLength && password.length > maxLength) {
    return `Use no more than ${maxLength} characters (${password.length} so far).`;
  }
  return policy?.hint;
}

export function authPasswordPolicyError(
  password: string,
  policy: AuthPasswordPolicy | undefined
): string | undefined {
  const minLength = normalizedPasswordLength(policy?.minLength);
  const maxLength = normalizedPasswordLength(policy?.maxLength);
  if (minLength && password.length < minLength) {
    return `Password must be at least ${minLength} characters.`;
  }
  if (maxLength && password.length > maxLength) {
    return `Password must be no more than ${maxLength} characters.`;
  }
  return policy?.validate?.(password);
}
