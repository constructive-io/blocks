import type { LucideIcon } from 'lucide-react';
import { Wrench } from 'lucide-react';

// ── Tool UI config ──────────────────────────────────────────────────────────

export interface ToolUIConfig {
  /** Status text shown next to the spinner/checkmark at each lifecycle stage. */
  labels: {
    /** Shown while the LLM is still streaming the tool's input arguments. */
    streaming: string;
    /** Shown while the tool function is executing (after approval, if required). */
    executing: string;
    /** Shown when the tool completes successfully. */
    done: string;
    /** Shown when the tool throws or returns an error. */
    error: string;
  };
  /** Icon displayed in the approval card header. Defaults to Wrench. */
  icon: LucideIcon;
  /** If set, the approval card shows a colored badge (e.g. "Send Email", "Delete Record"). */
  approval?: {
    badge: {
      /** Text inside the badge (e.g. "Send Email"). */
      label: string;
      /** Small icon rendered inside the badge. */
      icon: LucideIcon;
      /** Controls badge color: create = green, update = blue, delete = red. */
      variant: 'create' | 'update' | 'delete';
    };
  };
  /** Optional custom renderer for the tool input preview in the approval card. Receives the parsed tool input. */
  renderPreview?: (input: any) => React.ReactNode;
}

const DEFAULT_TOOL_UI: ToolUIConfig = {
  labels: {
    streaming: 'Working…',
    executing: 'Executing…',
    done: 'Done',
    error: 'Failed',
  },
  icon: Wrench,
};

// ── Per-tool overrides ──────────────────────────────────────────────────────

const toolUIRegistry: Record<
  string,
  Partial<Omit<ToolUIConfig, 'labels'>> & { labels?: Partial<ToolUIConfig['labels']> }
> = {
  // Example:
  // search_docs: {
  //   labels: { streaming: 'Searching…', executing: 'Searching…', done: 'Found results', error: 'Search failed' },
  //   icon: Search,
  // },
};

// ── Resolver ────────────────────────────────────────────────────────────────

export function getToolUI(toolName: string): ToolUIConfig {
  const custom = toolUIRegistry[toolName];
  if (!custom) return DEFAULT_TOOL_UI;
  return {
    ...DEFAULT_TOOL_UI,
    ...custom,
    labels: { ...DEFAULT_TOOL_UI.labels, ...custom.labels },
  };
}
