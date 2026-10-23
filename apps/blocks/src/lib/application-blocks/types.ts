import type { DocSectionId } from '../doc-sections';

export type ApplicationBlockApiRow = Readonly<{
  name: string;
  type: string;
  behavior: string;
}>;

/** One way to open a block's live preview, passed to its preview route as `?example=`. */
export type ApplicationBlockExample = Readonly<{
  value: string;
  label: string;
  description: string;
}>;

export type ApplicationBlockDoc = Readonly<{
  name: 'org-chart' | 'storage-browser' | 'agents-builder' | 'coding-agent' | 'data-rooms' | 'billing-account' | 'billing-console';
  /** Docs route when it is not `/blocks/<name>`, e.g. inside a section such as Billing. */
  href?: string;
  /** Section hub the block is listed under instead of its own nav item. */
  section?: DocSectionId;
  title: string;
  description: string;
  previewDescription: string;
  previewHeight: number;
  whenToUse: readonly string[];
  usage: Readonly<{
    description: string;
    example: string;
  }>;
  state: Readonly<{
    title: string;
    description: string;
  }>;
  composition: readonly string[];
  accessibility: readonly string[];
  api: readonly ApplicationBlockApiRow[];
  /** Leaf components the template is built from, each usable on its own, and how they install. */
  buildingBlocks?: Readonly<{ description: string; components: readonly ApplicationBlockApiRow[] }>;
  /** Named ways to open the live preview, chosen above the frame; the first is the default. */
  examples?: readonly ApplicationBlockExample[];
  /** Integration guides after basic usage, each with its own code example. */
  guides?: readonly Readonly<{ id: string; title: string; description: string; example: string }>[];
}>;
