import type * as React from 'react';
import type { MultiStepConfig } from './multi-step/types';
import type { KeyBinding } from './keybinding';

/** Command types determine execution behavior */
export type CommandType =
  | 'navigation'
  | 'action'
  | 'search'
  | 'external'
  | 'multi-step';

/** Individual command definition */
export interface CommandDefinition {
  /** Unique identifier */
  id: string;
  /** Display label */
  label: string;
  /** Optional description shown below label */
  description?: string;
  /** Icon component (e.g. from lucide-react) or icon name string */
  icon?: React.ComponentType<{ className?: string }> | string;
  /** Structured keyboard shortcut binding */
  shortcut?: KeyBinding;
  /** Command type determines execution behavior */
  type: CommandType;
  /** Group ID this command belongs to */
  group: string;
  /** Additional search keywords for filtering */
  keywords?: string[];
  /** Route path for navigation commands */
  href?: string;
  /** Whether to open in new tab (for external type) */
  external?: boolean;
  /** Handler for action/search commands. Signal is passed for background commands. */
  onSelect?: (signal?: AbortSignal) => void | Promise<void>;
  /** When true, command runs as a tracked background task after palette closes */
  background?: boolean;
  /**
   * Controls palette behavior after background dispatch.
   * - `'close'` (default) — close the palette
   * - `'reset'` — keep palette open, clear search to initial state
   * - `'persist'` — keep palette open, preserve current search/state
   * - `(controls) => void` — full control: close, reset, or set search to anything
   * Only applies when `background: true`.
   */
  backgroundBehavior?:
    | 'close'
    | 'reset'
    | 'persist'
    | ((controls: BackgroundPaletteControls) => void);
  /** Whether command is currently disabled (shown but not selectable) */
  disabled?: boolean;
  /** Whether to hide from palette entirely */
  hidden?: boolean;
  /** Sort priority within group (lower = higher priority, default 99) */
  priority?: number;
  /** Multi-step configuration (only when type === 'multi-step') */
  multiStep?: MultiStepConfig<any>;
}

/** Command group definition */
export interface CommandGroupDef {
  /** Unique identifier */
  id: string;
  /** Display label */
  label: string;
  /** Sort priority (lower = appears first) */
  priority: number;
}

/** Full command registry seed data */
export interface CommandRegistry {
  groups: CommandGroupDef[];
  commands: CommandDefinition[];
}

/** Navigation adapter — abstracts router.push for framework independence */
export type NavigateAdapter = (href: string) => void;

/** Palette controls exposed to backgroundBehavior callbacks */
export interface BackgroundPaletteControls {
  /** Close the palette */
  close: () => void;
  /** Clear search and keep palette open (back to initial state) */
  reset: () => void;
  /** Set the search input to a specific value */
  setSearch: (value: string) => void;
}
