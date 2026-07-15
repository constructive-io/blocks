import { describe, expect, it } from 'vitest';

import { estimatePasswordStrength } from './password-strength';

describe('estimatePasswordStrength', () => {
  it('returns weak for empty input', () => {
    expect(estimatePasswordStrength('')).toEqual({ score: 0, label: 'weak' });
  });

  it('short-circuits common passwords to weak', () => {
    expect(estimatePasswordStrength('password123').label).toBe('weak');
    expect(estimatePasswordStrength('qwerty').label).toBe('weak');
  });

  it('rates short low-diversity passwords as weak', () => {
    expect(estimatePasswordStrength('abc').label).toBe('weak');
  });

  it('rates a medium-length mixed password as fair or better', () => {
    const { label } = estimatePasswordStrength('Sunset12');
    expect(['fair', 'good', 'strong']).toContain(label);
  });

  it('rates a long, full-diversity password as strong', () => {
    expect(estimatePasswordStrength('Tr0ub4dour&3xtraL0ng!').label).toBe('strong');
  });

  it('caps score within 0–4', () => {
    const { score } = estimatePasswordStrength('Tr0ub4dour&3xtraL0ng!');
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(4);
  });
});
