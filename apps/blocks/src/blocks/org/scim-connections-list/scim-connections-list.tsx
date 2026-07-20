'use client';

/**
 * scim-connections-list  (registry: org-scim-connections-list)
 *
 * v2 STUB — Phase 3 (deferred, needs DB schema design).
 *
 * Lists active SCIM provider connections for an org. Each row would show:
 * the SCIM endpoint URL for the admin to configure in their IdP, last sync
 * timestamp, connection status, and a Revoke button.
 *
 * DEFERRED REASON: requires `constructive_auth_private.scim_providers` table
 * and the `constructive_auth_public.revoke_scim_token(scim_provider_id uuid)`
 * procedure. Neither exists in any public API yet — see `backend-spec/v2-sso-scim.md`.
 *
 * This stub renders an informational empty state. Once the SCIM backend ships
 * and codegen emits the relevant hooks from the `admin` namespace, this block
 * will be promoted to a full data block with:
 *   - useScimProvidersQuery (or equivalent) from @/generated/admin
 *   - useRevokeScimTokenMutation from @/generated/admin
 *   - org-scim-connections-list.requires.json
 *   - blocks-runtime as a registryDependency
 *
 * Presentational stub: no @/generated import, no data hook, no requires.json,
 * no blocks-runtime dependency, no QueryClientProvider.
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@constructive-io/ui/card';
import { Badge } from '@constructive-io/ui/badge';

import { cn } from '@/lib/utils';

import {
  defaultScimConnectionsListMessages,
  type OrgScimConnectionsListMessages,
  type OrgScimConnectionsListMessageOverrides
} from './messages';

export type { OrgScimConnectionsListMessageOverrides };

export type OrgScimConnectionsListProps = {
  /** The org ID whose SCIM connections to display. */
  orgId: string;
  /**
   * Base URL for the SCIM endpoint shown to the admin.
   * Rendered as `{scimBaseUrl}/scim/v2/{orgId}`.
   * When omitted, the endpoint column is hidden.
   */
  scimBaseUrl?: string;
  messages?: OrgScimConnectionsListMessageOverrides;
  /** Fires when a revoke action succeeds (future — no-op in the stub). */
  onRevokeSuccess?: (scimProviderId: string) => void;
  /** Fires on any error (future — no-op in the stub). */
  onError?: (err: { message: string; code: string }) => void;
  /** Notification seam (future — no-op in the stub). */
  onMessage?: (event: {
    kind: 'success' | 'error' | 'info' | 'warning';
    key: string;
    message?: string;
  }) => void;
  className?: string;
};

export function OrgScimConnectionsList({
  orgId: _orgId,
  scimBaseUrl: _scimBaseUrl,
  messages: messageOverrides,
  onRevokeSuccess: _onRevokeSuccess,
  onError: _onError,
  onMessage: _onMessage,
  className
}: OrgScimConnectionsListProps) {
  const merged: OrgScimConnectionsListMessages = {
    ...defaultScimConnectionsListMessages,
    ...messageOverrides,
    errors: {
      ...defaultScimConnectionsListMessages.errors,
      ...messageOverrides?.errors
    }
  };

  return (
    <Card data-slot="scim-connections-list" className={cn('w-full max-w-sm mx-auto', className)}>
      <CardHeader>
        <CardTitle>{merged.title}</CardTitle>
        <CardDescription>{merged.description}</CardDescription>
      </CardHeader>

      <CardContent>
        <div
          className="border-border/50 bg-muted/30 flex flex-col items-center gap-3 rounded-lg border border-dashed p-6 text-center"
          aria-live="polite"
          data-testid="scim-connections-empty-state"
        >
          <Badge variant="secondary" className="text-xs">
            {merged.backendPendingLabel}
          </Badge>
          <p className="text-pretty text-muted-foreground text-sm font-medium">{merged.emptyTitle}</p>
          <p className="text-pretty text-muted-foreground/80 max-w-xs text-xs">{merged.emptyDescription}</p>
        </div>
      </CardContent>
    </Card>
  );
}
