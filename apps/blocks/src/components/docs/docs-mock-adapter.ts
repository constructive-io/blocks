/**
 * DocsMockAdapter — an in-memory `GraphQLAdapter` for docs-only live previews.
 *
 * The docs site is the "host" for these previews. Real hosts wire blocks via
 * `blocks-runtime`, which calls each namespace's generated `configure({ adapter })`
 * with a real fetch adapter. Here we call the same `configure()` seam with this
 * mock instead, so every block renders against canned data and zero network.
 *
 * `execute(document)` matches the operation by the field name present in the
 * GraphQL document string and resolves the matching fixture, shaped as the raw
 * `data` envelope (the ORM query-builder then runs its `transform()` on it).
 * Unmatched operations resolve to an empty success so a block falls back to its
 * own empty/default state rather than erroring.
 *
 * Mutations are normally NOT routed here — preview pages drive those through
 * each block's `onSubmit*` override seam for deterministic success/error states.
 * The exception is the imperative `use-step-up` demo: it drives `StepUpDialog`
 * via `StepUpProvider`, which exposes no override seam, so its `verifyPassword`/
 * `verifyTotp` mutations (and the `requireStepUp` gate) resolve here instead.
 *
 * Docs harness only — never imported by block source.
 */

import type { GraphQLAdapter, QueryResult } from '@/generated/auth';

import { previewCurrentUser, previewEmails, previewRequireStepUp, previewVerifyPassword, previewVerifyTotp, previewPhoneNumbers, previewAppMemberships, previewOrgUser, previewOrgMemberships, previewOrgProfiles } from './preview-fixtures';

type Handler = { test: RegExp; data: () => unknown };

// Ordered most-specific first; first match wins. Operations are matched by the
// field name present in the GraphQL document string.
const HANDLERS: Handler[] = [
  { test: /\bemails\b/i, data: () => previewEmails },
  { test: /\brequireStepUp\b/, data: () => previewRequireStepUp },
  { test: /\bverifyPassword\b/, data: () => previewVerifyPassword },
  { test: /\bverifyTotp\b/, data: () => previewVerifyTotp },
  { test: /\bphoneNumbers\b/, data: () => previewPhoneNumbers },
  { test: /\bappMemberships\b/, data: () => previewAppMemberships },
  { test: /\borgMemberships\b/i, data: () => previewOrgMemberships },
  { test: /\borgProfiles\b/, data: () => previewOrgProfiles },
  // shell-account-menu: must come before the generic `user` handler.
  { test: /\bcurrentUser\b/, data: () => previewCurrentUser },
  // Generic single-`user` query (org-settings-form) — LAST so it never shadows
  // the specific handlers above (\b excludes `users`, `currentUser`).
  { test: /\buser\b/i, data: () => previewOrgUser },
];

export class DocsMockAdapter implements GraphQLAdapter {
  async execute<T>(document: string, _variables?: Record<string, unknown>): Promise<QueryResult<T>> {
    const handler = HANDLERS.find((h) => h.test.test(document));
    const data = (handler ? handler.data() : {}) as T;
    return { ok: true, data, errors: undefined };
  }

  getEndpoint(): string {
    return 'docs://mock-adapter';
  }
}
