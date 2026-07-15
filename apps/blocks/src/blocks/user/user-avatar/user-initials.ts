/**
 * user-initials  (registry: user-avatar / lib)
 *
 * Derives a 1-2 character initials string from a display name.
 *
 * Rules (per spec):
 *   - Split on whitespace.
 *   - If 2+ words: first letter of first word + first letter of last word (uppercase). Max 2 chars.
 *   - If 1 word: first 2 characters (uppercase). If only 1 char, use that.
 *   - If displayName is empty and username is provided: use first character of username (uppercase).
 *   - If displayName is empty and no username: return '?'.
 *   - Non-alphabetic-only names: use first available character (no special filtering).
 */

/**
 * Derives up to 2 initials characters from a display name, with a username
 * fallback and a '?' sentinel for fully empty input.
 */
export function deriveInitials(displayName: string, username?: string | null): string {
  const trimmed = displayName.trim();

  if (!trimmed) {
    if (username && username.trim()) return username.trim()[0].toUpperCase();
    return '?';
  }

  const words = trimmed.split(/\s+/);

  if (words.length >= 2) {
    const first = words[0][0] ?? '';
    const last = words[words.length - 1][0] ?? '';
    return (first + last).toUpperCase().slice(0, 2);
  }

  // Single word — take up to 2 chars
  return words[0].slice(0, 2).toUpperCase();
}
