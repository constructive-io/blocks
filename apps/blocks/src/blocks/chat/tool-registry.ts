/**
 * Tool registry — define your chat tools here.
 *
 * Pure data + execute functions. No React.
 * Importable by both server (route.ts) and client (ToolMessage).
 */
import { z } from 'zod';

// ── Tool entry type ─────────────────────────────────────────────────────────

export interface ToolEntry<TInput = unknown> {
  description: string;
  inputSchema: z.ZodType<TInput>;
  /** 'server' = executes in the API route, 'client' = executes in the browser */
  type: 'server' | 'client';
  /** When true, the user must approve before execution */
  needsApproval: boolean;
  execute: (input: TInput) => Promise<string>;
}

// ── Registry ────────────────────────────────────────────────────────────────

export const toolRegistry: Record<string, ToolEntry<any>> = {
  // Example:
  // search_docs: {
  //   description: 'Search the knowledge base for relevant documents',
  //   inputSchema: z.object({ query: z.string() }),
  //   type: 'server',
  //   needsApproval: false,
  //   execute: async (input) => {
  //     const results = await searchVectorStore(input.query);
  //     return JSON.stringify({ results });
  //   },
  // },
};
