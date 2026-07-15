'use client';

/**
 * scim-setup-guide  (registry: org-scim-setup-guide)
 *
 * v2 STUB — Phase 3: Minimal presentational placeholder.
 *
 * Renders provider-specific SCIM 2.0 setup instructions (Okta, Azure AD /
 * Entra ID, JumpCloud, Google Workspace, Generic). Shows the SCIM endpoint
 * URL and attribute mapping table that admins must configure in their IdP.
 *
 * This is a STATIC documentation surface — no DB mutations, no generated hook
 * imports, no `requires.json`, and `blocks-runtime` is NOT a registryDependency.
 * The block is entirely presentational; only `orgId` and `scimBaseUrl` are
 * dynamic (injected via props).
 *
 * DEFERRED because:
 *   - SCIM token generation (`org-scim-token-generation-card`) and the
 *     `scim_providers` table do not yet exist in the backend.
 *   - A future v2 iteration will add a read query for token metadata from
 *     the `admin` namespace SDK and ship a `requires.json` at that time.
 *
 * sdk-binding-contract.md §7 — presentational blocks ship NO `requires.json`.
 * sdk-binding-contract.md §3 — no `@/generated/*` import in this file.
 */

import { useState } from 'react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@constructive-io/ui/card';
import { Badge } from '@constructive-io/ui/badge';
import { Button } from '@constructive-io/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@constructive-io/ui/alert';

import { cn } from '@/lib/utils';

import {
  defaultOrgScimSetupGuideMessages,
  type OrgScimSetupGuideMessages
} from './messages';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type SupportedScimProvider = 'okta' | 'azure-ad' | 'jumpcloud' | 'google-workspace' | 'generic';

export type OrgScimSetupGuideMessageOverrides = Partial<OrgScimSetupGuideMessages>;

export type OrgScimSetupGuideProps = {
  /** Target org ID — used to build the SCIM endpoint path. */
  orgId: string;
  /** Which IdP guide to show. Defaults to `'okta'`. */
  provider?: SupportedScimProvider;
  /**
   * The SCIM base URL embedded in instructions.
   * When omitted the component renders a `<your-scim-endpoint>` placeholder.
   */
  scimBaseUrl?: string;
  messages?: OrgScimSetupGuideMessageOverrides;
  /** Fires when an unexpected error occurs (e.g. clipboard failure). */
  onError?: (err: unknown) => void;
  className?: string;
};

// ---------------------------------------------------------------------------
// Static provider metadata
// ---------------------------------------------------------------------------

const PROVIDERS: { value: SupportedScimProvider; label: string }[] = [
  { value: 'okta', label: 'Okta' },
  { value: 'azure-ad', label: 'Azure AD / Entra ID' },
  { value: 'jumpcloud', label: 'JumpCloud' },
  { value: 'google-workspace', label: 'Google Workspace' },
  { value: 'generic', label: 'Generic SCIM 2.0' }
];

/**
 * SCIM core attribute mappings. These are provider-agnostic SCIM 2.0 field
 * names; the IdP column shows how each provider names the concept.
 */
const ATTRIBUTE_MAPPINGS: { constructiveField: string; scimAttribute: string; description: string }[] = [
  { constructiveField: 'email', scimAttribute: 'userName / emails[0].value', description: 'Primary email address' },
  {
    constructiveField: 'displayName',
    scimAttribute: 'displayName',
    description: 'Human-readable name for the user'
  },
  { constructiveField: 'givenName', scimAttribute: 'name.givenName', description: 'First name' },
  { constructiveField: 'familyName', scimAttribute: 'name.familyName', description: 'Last name' },
  { constructiveField: 'active', scimAttribute: 'active', description: 'Account active / suspended state' },
  { constructiveField: 'externalId', scimAttribute: 'externalId', description: 'IdP-assigned unique identifier' }
];

/**
 * Provider-specific doc links (informational only — opens in new tab).
 */
const PROVIDER_DOCS: Record<SupportedScimProvider, { label: string; href: string }> = {
  okta: {
    label: 'Okta SCIM docs',
    href: 'https://developer.okta.com/docs/guides/scim-provisioning-integration-overview/main/'
  },
  'azure-ad': {
    label: 'Entra ID SCIM docs',
    href: 'https://learn.microsoft.com/en-us/azure/active-directory/app-provisioning/user-provisioning'
  },
  jumpcloud: {
    label: 'JumpCloud SCIM docs',
    href: 'https://jumpcloud.com/support/getting-started-with-scim-provisioning'
  },
  'google-workspace': {
    label: 'Google Workspace SCIM docs',
    href: 'https://support.google.com/a/answer/10429003'
  },
  generic: {
    label: 'SCIM 2.0 RFC 7644',
    href: 'https://datatracker.ietf.org/doc/html/rfc7644'
  }
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function CopyableCode({
  value,
  copyLabel,
  copiedLabel,
  onError
}: {
  value: string;
  copyLabel: string;
  copiedLabel: string;
  onError?: (err: unknown) => void;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      onError?.(err);
    }
  }

  return (
    <div className="bg-muted flex items-center justify-between gap-3 rounded-md px-3 py-2 font-mono text-sm">
      <span className="min-w-0 truncate">{value}</span>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-7 shrink-0 text-xs"
        onClick={handleCopy}
        data-testid="copy-button"
      >
        {copied ? copiedLabel : copyLabel}
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function OrgScimSetupGuide({
  orgId,
  provider: providerProp = 'okta',
  scimBaseUrl,
  messages: messageOverrides,
  onError,
  className
}: OrgScimSetupGuideProps) {
  const merged: OrgScimSetupGuideMessages = {
    ...defaultOrgScimSetupGuideMessages,
    ...messageOverrides
  };

  const [activeProvider, setActiveProvider] = useState<SupportedScimProvider>(providerProp);

  const scimEndpoint = scimBaseUrl
    ? `${scimBaseUrl.replace(/\/$/, '')}/scim/v2/${orgId}`
    : `<your-scim-endpoint>/scim/v2/${orgId}`;

  const providerDoc = PROVIDER_DOCS[activeProvider];

  return (
    <Card data-slot="scim-setup-guide" className={cn('w-full max-w-sm mx-auto', className)}>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle>{merged.title}</CardTitle>
          <Badge variant="outline" className="text-muted-foreground shrink-0 text-xs">
            Preview
          </Badge>
        </div>
        <CardDescription>{merged.description}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Deferred banner */}
        <Alert>
          <AlertTitle>{merged.deferredBannerTitle}</AlertTitle>
          <AlertDescription>{merged.deferredBannerBody}</AlertDescription>
        </Alert>

        {/* Provider selector */}
        <div className="space-y-2">
          <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
            {merged.providerLabel}
          </p>
          <div className="flex flex-wrap gap-2" role="group" aria-label={merged.providerLabel}>
            {PROVIDERS.map((p) => (
              <Button
                key={p.value}
                type="button"
                variant={activeProvider === p.value ? 'default' : 'outline'}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setActiveProvider(p.value)}
                data-testid={`provider-${p.value}`}
              >
                {p.label}
              </Button>
            ))}
          </div>
        </div>

        {/* SCIM Endpoint */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">{merged.sectionEndpointTitle}</h3>
          <p className="text-muted-foreground text-sm">{merged.sectionEndpointDescription}</p>
          <CopyableCode
            value={scimEndpoint}
            copyLabel={merged.copyButtonLabel}
            copiedLabel={merged.copiedButtonLabel}
            onError={onError}
          />
        </div>

        {/* Bearer Token */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">{merged.sectionTokenTitle}</h3>
          <p className="text-muted-foreground text-sm">{merged.sectionTokenDescription}</p>
        </div>

        {/* Attribute mappings */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">{merged.sectionAttributesTitle}</h3>
          <p className="text-muted-foreground text-sm">{merged.sectionAttributesDescription}</p>
          <div className="overflow-x-auto rounded-md border text-sm">
            <table className="w-full text-left" data-testid="attribute-mappings-table">
              <thead className="bg-muted/60">
                <tr>
                  <th className="px-3 py-2 font-medium">Constructive field</th>
                  <th className="px-3 py-2 font-medium">SCIM attribute</th>
                </tr>
              </thead>
              <tbody>
                {ATTRIBUTE_MAPPINGS.map((row) => (
                  <tr key={row.constructiveField} className="border-t">
                    <td className="px-3 py-2 font-mono text-xs">{row.constructiveField}</td>
                    <td className="text-muted-foreground px-3 py-2 font-mono text-xs">{row.scimAttribute}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* External docs link */}
        <p className="text-muted-foreground text-sm">
          For step-by-step instructions, see the{' '}
          <a
            href={providerDoc.href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:text-primary/80 font-medium"
          >
            {providerDoc.label}
          </a>
          .
        </p>
      </CardContent>
    </Card>
  );
}
