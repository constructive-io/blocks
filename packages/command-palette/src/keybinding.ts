/** Modifier key abstraction. 'mod' = Cmd on Mac, Ctrl on Windows/Linux. */
export type KeyModifier = 'mod' | 'shift' | 'alt';

/** Structured key binding — matchable against KeyboardEvents. */
export interface KeyBinding {
  modifiers?: KeyModifier[];
  /** Lowercase key name: 'h', 'k', 'enter', 'backspace', ',', '/', etc. */
  key: string;
}

/** Ergonomic KeyBinding factory. */
export function kbd(key: string, ...modifiers: KeyModifier[]): KeyBinding {
  return modifiers.length > 0 ? { key, modifiers } : { key };
}

/** Platform detection with SSR fallback (assumes non-Mac). */
export function isMac(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /mac|ipod|iphone|ipad/i.test(navigator.platform ?? '');
}

/** Check if event target is an editable element (input, textarea, select, contenteditable). */
export function isEditableTarget(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  return target.contentEditable === 'true';
}

/** Match a KeyboardEvent against a KeyBinding with strict modifier check. */
export function matchKeyBinding(
  event: KeyboardEvent,
  binding: KeyBinding
): boolean {
  // Compare key (case-insensitive)
  if (event.key.toLowerCase() !== binding.key.toLowerCase()) return false;

  const mods = binding.modifiers ?? [];
  const wantMod = mods.includes('mod');
  const wantShift = mods.includes('shift');
  const wantAlt = mods.includes('alt');

  // On Mac, 'mod' maps to metaKey; elsewhere, ctrlKey
  const modPressed = isMac() ? event.metaKey : event.ctrlKey;

  // Strict: every required modifier must be pressed, no extras
  if (wantMod !== modPressed) return false;
  if (wantShift !== event.shiftKey) return false;
  if (wantAlt !== event.altKey) return false;

  // Prevent false positives: if mod maps to meta on Mac, ctrl shouldn't be pressed (and vice versa)
  if (isMac()) {
    if (!wantMod && event.ctrlKey) return false;
  } else {
    if (!wantMod && event.metaKey) return false;
  }

  return true;
}

/**
 * Format a KeyBinding for display. Returns an array of per-key symbols.
 * Mac: ['⌘', 'H'], PC: ['Ctrl', 'H']
 */
export function formatKeyBinding(binding: KeyBinding): string[] {
  const mac = isMac();
  const parts: string[] = [];

  for (const mod of binding.modifiers ?? []) {
    switch (mod) {
      case 'mod':
        parts.push(mac ? '⌘' : 'Ctrl');
        break;
      case 'shift':
        parts.push(mac ? '⇧' : 'Shift');
        break;
      case 'alt':
        parts.push(mac ? '⌥' : 'Alt');
        break;
    }
  }

  // Capitalize single-char keys for display
  const display =
    binding.key.length === 1 ? binding.key.toUpperCase() : binding.key;
  parts.push(display);

  return parts;
}
