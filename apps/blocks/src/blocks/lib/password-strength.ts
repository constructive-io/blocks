/**
 * Password strength scorer
 *
 * A tiny, dependency-free heuristic scorer for inline password-strength UX.
 * Deliberately NOT zxcvbn (which is ~400KB+) — this is a lightweight entropy
 * estimate good enough to nudge users toward stronger passwords. It is UX-only:
 * the server's `check_password` procedure is the real gate (see
 * `auth-sign-up-card` spec §"Notes / gotchas"). Never block submission on the
 * client score — only surface it.
 *
 * Shared foundation lib: imported by `auth-sign-up-card` and
 * `auth-reset-password-card`. Zero imports so it ships as a standalone
 * `password-strength` registry item.
 */

/** Strength label — maps 1:1 to the four `passwordStrength*` message keys. */
export type PasswordStrengthLabel = 'weak' | 'fair' | 'good' | 'strong';

export interface PasswordStrength {
  /**
   * 0–4 granularity for a progress meter (`value = score / 4 * 100`).
   * 0–1 → weak, 2 → fair, 3 → good, 4 → strong.
   */
  score: 0 | 1 | 2 | 3 | 4;
  label: PasswordStrengthLabel;
}

const SCORE_TO_LABEL: Record<PasswordStrength['score'], PasswordStrengthLabel> = {
  0: 'weak',
  1: 'weak',
  2: 'fair',
  3: 'good',
  4: 'strong'
};

/** A few of the most common passwords/patterns — an instant "weak". */
const COMMON = /^(?:password|passw0rd|123456|12345678|qwerty|letmein|admin|welcome|iloveyou)/i;

/**
 * Estimate password strength from length and character-class diversity, with a
 * penalty for obvious common patterns. Pure and deterministic.
 *
 * @example
 * const { score, label } = estimatePasswordStrength(value);
 * // score → Progress value (score / 4 * 100); label → messages[`passwordStrength${Pascal(label)}`]
 */
export function estimatePasswordStrength(password: string): PasswordStrength {
  if (!password) return { score: 0, label: 'weak' };

  // Obvious common passwords short-circuit to weak regardless of length.
  if (COMMON.test(password)) return { score: 0, label: 'weak' };

  const len = password.length;
  const classes =
    Number(/[a-z]/.test(password)) +
    Number(/[A-Z]/.test(password)) +
    Number(/[0-9]/.test(password)) +
    Number(/[^A-Za-z0-9]/.test(password));

  // Length contributes the bulk of the signal; class diversity refines it.
  let points = 0;
  if (len >= 8) points += 1;
  if (len >= 12) points += 1;
  if (len >= 16) points += 1;
  if (classes >= 2) points += 1;
  if (classes >= 3) points += 1;
  if (classes >= 4) points += 1;

  // A long-but-monotonous password (e.g. all-lowercase) stays modest; a short
  // one never reaches the top tiers even with high diversity.
  if (len < 8) points = Math.min(points, 1);

  const score = Math.min(4, Math.max(0, points - 1)) as PasswordStrength['score'];
  return { score, label: SCORE_TO_LABEL[score] };
}
