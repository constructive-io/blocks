'use client';

/**
 * sso-setup-card  (registry: auth-sso-setup-card)
 *
 * v2 STUB — Phase 3 placeholder. The SSO backend (sso_providers table,
 * configure_sso_provider / delete_sso_provider procedures) is not yet
 * designed or deployed (backend-spec/v2-sso-scim.md). This card exists so
 * the catalog is complete; full implementation is deferred.
 *
 * This is a PRESENTATIONAL block:
 *   • No @/generated import — no data binding, no form submission.
 *   • No blocks-runtime dependency.
 *   • No requires.json.
 *
 * It renders a card describing the OIDC/SAML SSO capability with a clear
 * "coming in a later phase" notice, targeted for use inside org settings pages.
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@constructive-io/ui/card';
import { Badge } from '@constructive-io/ui/badge';

import { cn } from '@/lib/utils';

import { defaultSsoSetupCardMessages, type SsoSetupCardMessages } from './messages';

export type SsoSetupCardMessageOverrides = Partial<Omit<SsoSetupCardMessages, 'errors'>> & {
  errors?: Partial<SsoSetupCardMessages['errors']>;
};

export type SsoSetupCardProps = {
  /** The org (User type=2) to configure SSO for. Accepted for future-compat; unused in stub. */
  orgId: string;
  messages?: SsoSetupCardMessageOverrides;
  className?: string;
};

export function SsoSetupCard({ orgId: _orgId, messages: messageOverrides, className }: SsoSetupCardProps) {
  const merged: SsoSetupCardMessages = {
    ...defaultSsoSetupCardMessages,
    ...messageOverrides,
    errors: { ...defaultSsoSetupCardMessages.errors, ...messageOverrides?.errors }
  };

  return (
    <Card data-slot="sso-setup-card" className={cn('w-full max-w-sm mx-auto', className)}>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CardTitle>{merged.title}</CardTitle>
          <Badge variant="secondary" data-testid="coming-soon-badge">
            {merged.comingSoonHeading}
          </Badge>
        </div>
        <CardDescription>{merged.description}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div
          className="bg-muted/50 rounded-md border p-4 text-sm"
          aria-live="polite"
          data-testid="coming-soon-notice"
        >
          {merged.comingSoonBody}
        </div>

        <div className="space-y-2">
          <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
            {merged.protocolsSectionLabel}
          </p>
          <ul className="space-y-1 list-none" aria-label={merged.protocolsAriaLabel}>
            <li className="text-muted-foreground flex items-center gap-2 text-sm">
              <span className="bg-muted inline-block size-1.5 rounded-full" aria-hidden="true" />
              {merged.oidcLabel}
            </li>
            <li className="text-muted-foreground flex items-center gap-2 text-sm">
              <span className="bg-muted inline-block size-1.5 rounded-full" aria-hidden="true" />
              {merged.samlLabel}
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
