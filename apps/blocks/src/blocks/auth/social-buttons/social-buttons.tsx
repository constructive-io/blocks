'use client';

/**
 * auth-social-buttons  (registry: auth-social-buttons)
 *
 * Row of OAuth provider sign-in / sign-up buttons.
 *
 * DEFAULT DATA PATH — generated hook (sdk-binding-contract.md §3, §5):
 *   `useIdentityProvidersQuery` is imported from `@/generated/auth` (the host's
 *   generated `auth` SDK). The block calls it with a `selection` field-picker
 *   and maps `data.identityProviders.nodes` → IdentityProvider[].
 *
 * STATIC OVERRIDE — when `providers` prop is set the DB query is skipped
 *   (enabled: false React Query option) and the static slug list is used.
 *
 * OAUTH FLOW — the block constructs `/auth/{slug}?return_to={encoded}` and
 *   navigates with `window.location.href`. It does NOT call any sign-in
 *   mutation; the Express OAuth middleware handles the handshake.
 *
 * NO client bootstrap — the host mounts `@constructive/blocks-runtime` once;
 *   this block never calls configure()/getClient() or mounts a QueryClientProvider.
 */

import { useState, useEffect } from 'react';
import { Separator } from '@constructive-io/ui/separator';
import { Skeleton } from '@constructive-io/ui/skeleton';
import { Button } from '@constructive-io/ui/button';

import { cn } from '@/lib/utils';
import { useIdentityProvidersQuery } from '@/generated/auth';
import { parseGraphQLError } from '@/blocks/lib/auth-errors';
import { AuthErrorAlert } from '@/blocks/primitives/auth-error-alert';

import { defaultAuthSocialButtonsMessages, type AuthSocialButtonsMessages, type AuthSocialButtonsMessageOverrides } from './messages';

// ─── Provider types ──────────────────────────────────────────────────────────

export type IdentityProvider = {
  slug: string;
  displayName: string;
  /** 'oidc' | 'oauth2' | 'saml' — only oidc/oauth2 are v1 */
  kind: string;
};

export type SocialButtonsLayout = 'stacked' | 'grid' | 'icon-only';

// ─── Built-in slug → display name map ────────────────────────────────────────

const BUILTIN_DISPLAY_NAMES: Record<string, string> = {
  google: 'Google',
  github: 'GitHub',
  apple: 'Apple',
  facebook: 'Facebook',
  microsoft: 'Microsoft',
  linkedin: 'LinkedIn',
  slack: 'Slack'
};

// Built-in provider order (slug alphabetical for built-ins, then custom)
const BUILTIN_ORDER = ['apple', 'facebook', 'github', 'google', 'linkedin', 'microsoft', 'slack'];

// ─── SVG Icons ───────────────────────────────────────────────────────────────

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="currentColor">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  );
}

function AppleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="currentColor">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
  );
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="#1877F2">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function MicrosoftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M11.4 2H2v9.4h9.4V2z" fill="#F25022" />
      <path d="M22 2h-9.4v9.4H22V2z" fill="#7FBA00" />
      <path d="M11.4 12.6H2V22h9.4v-9.4z" fill="#00A4EF" />
      <path d="M22 12.6h-9.4V22H22v-9.4z" fill="#FFB900" />
    </svg>
  );
}

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="#0A66C2">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

function SlackIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M5.042 15.165a2.528 2.528 0 01-2.52 2.523A2.528 2.528 0 010 15.165a2.527 2.527 0 012.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 012.521-2.52 2.527 2.527 0 012.521 2.52v6.313A2.528 2.528 0 018.834 24a2.528 2.528 0 01-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 01-2.521-2.52A2.528 2.528 0 018.834 0a2.528 2.528 0 012.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 012.521 2.521 2.528 2.528 0 01-2.521 2.521H2.522A2.528 2.528 0 010 8.834a2.528 2.528 0 012.522-2.521h6.312zm10.122 2.521a2.528 2.528 0 012.522-2.521A2.528 2.528 0 0124 8.834a2.528 2.528 0 01-2.522 2.521h-2.522V8.834zm-1.268 0a2.528 2.528 0 01-2.523 2.521 2.527 2.527 0 01-2.52-2.521V2.522A2.527 2.527 0 0115.165 0a2.528 2.528 0 012.523 2.522v6.312zm-2.523 10.122a2.528 2.528 0 012.523 2.522A2.528 2.528 0 0115.165 24a2.527 2.527 0 01-2.52-2.522v-2.522h2.52zm0-1.268a2.527 2.527 0 01-2.52-2.523 2.526 2.526 0 012.52-2.52h6.313A2.527 2.527 0 0124 15.165a2.528 2.528 0 01-2.522 2.523h-6.313z" fill="#E01E5A" />
    </svg>
  );
}

function GenericOAuthIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20" />
    </svg>
  );
}

const PROVIDER_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  google: GoogleIcon,
  github: GitHubIcon,
  apple: AppleIcon,
  facebook: FacebookIcon,
  microsoft: MicrosoftIcon,
  linkedin: LinkedInIcon,
  slack: SlackIcon
};

function ProviderIcon({ slug, className }: { slug: string; className?: string }) {
  const Icon = PROVIDER_ICONS[slug] ?? GenericOAuthIcon;
  return <Icon className={className} />;
}

// ─── Interpolation helper ─────────────────────────────────────────────────────

function interpolateProvider(template: string, providerName: string): string {
  return template.replace(/\{\{provider\}\}/g, providerName);
}

// ─── Props ───────────────────────────────────────────────────────────────────

export type AuthSocialButtonsProps = {
  /**
   * Static provider slug list — when set, the DB query is skipped.
   * Known slugs: 'google' | 'github' | 'apple' | 'facebook' | 'microsoft' | 'linkedin' | 'slack'.
   * Custom slugs are allowed (renders generic icon + slug as displayName).
   */
  providers?: string[];
  /**
   * Sign-in or sign-up mode (affects button labels).
   * Default: 'sign-in'
   */
  mode?: 'sign-in' | 'sign-up';
  /** Button layout. Default: 'stacked' */
  layout?: SocialButtonsLayout;
  /** Show divider above buttons with label text. Default: true */
  showDivider?: boolean;
  /**
   * `return_to` URL appended to the OAuth redirect.
   * Defaults to `window.location.href` at click time (falls back to `'/'` in SSR).
   */
  returnTo?: string;
  /**
   * Base path for the Express OAuth middleware.
   * Default: '/auth'
   * If your Next.js app and Express server are on different origins, pass the
   * full origin here (e.g. 'https://auth.example.com/auth').
   */
  baseOAuthPath?: string;
  /**
   * Custom render function for each provider button.
   * Return null to fall back to the default rendering.
   */
  renderButton?: (provider: IdentityProvider) => React.ReactNode | null;
  /**
   * Called before navigating to the OAuth URL.
   * Return false to cancel navigation (for testing or analytics).
   */
  onProviderClick?: (provider: IdentityProvider, url: string) => boolean | void;
  messages?: AuthSocialButtonsMessageOverrides;
  onError?: (err: unknown) => void;
  onMessage?: (event: { kind: 'success' | 'error' | 'info' | 'warning'; key: string; message?: string }) => void;
  className?: string;
};

// ─── Component ───────────────────────────────────────────────────────────────

export function AuthSocialButtons({
  providers: staticProviders,
  mode = 'sign-in',
  layout = 'stacked',
  showDivider = true,
  returnTo,
  baseOAuthPath = '/auth',
  renderButton,
  onProviderClick,
  messages: messageOverrides,
  onError,
  onMessage,
  className
}: AuthSocialButtonsProps) {
  // Deep merge messages (top-level shallow + errors sub-map separately).
  const merged: AuthSocialButtonsMessages = {
    ...defaultAuthSocialButtonsMessages,
    ...messageOverrides,
    errors: { ...defaultAuthSocialButtonsMessages.errors, ...messageOverrides?.errors }
  };

  const [fetchError, setFetchError] = useState<string | null>(null);

  // Generated hook from the host's `auth` SDK. The `enabled` flag bypasses the
  // DB call entirely when a static `providers` prop is set.
  const providersQuery = useIdentityProvidersQuery({
    selection: {
      fields: { slug: true, kind: true, displayName: true, enabled: true }
    },
    enabled: !staticProviders,
    staleTime: 5 * 60 * 1000
  });

  // Derive the final provider list from either the static prop or the DB query.
  const providerList: IdentityProvider[] = (() => {
    if (staticProviders) {
      return staticProviders.map((slug) => ({
        slug,
        displayName: BUILTIN_DISPLAY_NAMES[slug] ?? slug,
        kind: 'oauth2'
      }));
    }

    if (providersQuery.data) {
      const nodes = providersQuery.data.identityProviders?.nodes ?? [];
      const filtered = nodes
        .filter((n) => n.enabled !== false)
        .map((n) => ({
          slug: n.slug ?? '',
          displayName: n.displayName ?? BUILTIN_DISPLAY_NAMES[n.slug ?? ''] ?? n.slug ?? '',
          kind: n.kind ?? 'oauth2'
        }))
        .filter((p) => p.slug);

      // Sort: built-ins first (BUILTIN_ORDER alphabetical), then custom alphabetically.
      return filtered.sort((a, b) => {
        const ai = BUILTIN_ORDER.indexOf(a.slug);
        const bi = BUILTIN_ORDER.indexOf(b.slug);
        if (ai !== -1 && bi !== -1) return ai - bi;
        if (ai !== -1) return -1;
        if (bi !== -1) return 1;
        return a.slug.localeCompare(b.slug);
      });
    }

    return [];
  })();

  // Sync query error into state (in an effect to avoid render-phase setState —
  // same pattern as passkey-management-list.tsx line 234).
  // M1: destructure `code` so onMessage carries the actual error code, not a
  // hardcoded fallback.
  useEffect(() => {
    if (providersQuery.error && !staticProviders) {
      const { code, message } = parseGraphQLError(providersQuery.error, {
        customMessages: merged.errors,
        defaultMessage: merged.errors.UNKNOWN_ERROR
      });
      setFetchError(message);
      onMessage?.({ kind: 'error', key: code ?? 'UNKNOWN_ERROR', message });
      onError?.(providersQuery.error);
    } else if (!providersQuery.error) {
      setFetchError(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [providersQuery.error, staticProviders]);

  // Loading state — show skeletons.
  const isLoading = !staticProviders && providersQuery.isPending;

  // B2: Fire onMessage({ kind: 'info', key: 'noProviders' }) when provider list
  // resolves to empty — the host uses this seam for analytics / auto-collapse.
  useEffect(() => {
    if (!isLoading && providerList.length === 0 && !fetchError) {
      onMessage?.({ kind: 'info', key: 'noProviders', message: merged.noProvidersMessage });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [providerList.length, isLoading, fetchError]);

  // Build OAuth redirect URL.
  function buildOAuthUrl(slug: string): string {
    const base = baseOAuthPath.replace(/\/$/, '');
    const ret = returnTo ?? (typeof window !== 'undefined' ? window.location.href : '/');
    return `${base}/${slug}?return_to=${encodeURIComponent(ret)}`;
  }

  function handleProviderClick(provider: IdentityProvider) {
    const url = buildOAuthUrl(provider.slug);
    const shouldNavigate = onProviderClick?.(provider, url);
    if (shouldNavigate === false) return;
    if (typeof window !== 'undefined') {
      window.location.href = url;
    }
  }

  // Label helper.
  function getLabel(provider: IdentityProvider): string {
    const template =
      mode === 'sign-up'
        ? merged.signUpWith
        : mode === 'sign-in'
          ? merged.signInWith
          : merged.continueWith;
    return interpolateProvider(template, provider.displayName);
  }

  function getAriaLabel(provider: IdentityProvider): string {
    return interpolateProvider(merged.iconOnlyAriaLabel, provider.displayName);
  }

  return (
    <div data-slot="social-buttons" className={cn('w-full max-w-sm mx-auto', className)}>
      {showDivider && (
        <div className="flex items-center gap-3 py-3">
          <Separator className="flex-1" />
          <span className="text-muted-foreground text-xs">{merged.dividerText}</span>
          <Separator className="flex-1" />
        </div>
      )}

      <AuthErrorAlert error={fetchError} />

      {isLoading ? (
        <div className="space-y-2" aria-label={merged.loadingAriaLabel} aria-busy="true">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-10 w-full rounded-md" />
          ))}
        </div>
      ) : providerList.length === 0 && !isLoading ? (
        <p className="text-muted-foreground text-center text-sm py-2">{merged.noProvidersMessage}</p>
      ) : (
        <div
          className={cn(
            layout === 'grid' && providerList.length >= 4
              ? 'grid grid-cols-2 gap-2'
              : 'flex flex-col gap-2',
            layout === 'icon-only' && 'flex flex-row flex-wrap gap-2 justify-center'
          )}
        >
          {providerList.map((provider) => {
            // Allow host to render a custom button.
            const custom = renderButton?.(provider);
            if (custom !== null && custom !== undefined) return custom;

            if (layout === 'icon-only') {
              return (
                <Button
                  key={provider.slug}
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label={getAriaLabel(provider)}
                  data-testid={`social-btn-${provider.slug}`}
                  onClick={() => handleProviderClick(provider)}
                >
                  <ProviderIcon slug={provider.slug} className="size-5" />
                </Button>
              );
            }

            return (
              <Button
                key={provider.slug}
                type="button"
                variant="outline"
                className="w-full justify-start gap-3"
                aria-label={getLabel(provider)}
                data-testid={`social-btn-${provider.slug}`}
                onClick={() => handleProviderClick(provider)}
              >
                <ProviderIcon slug={provider.slug} className="size-5 shrink-0" />
                <span>{getLabel(provider)}</span>
              </Button>
            );
          })}
        </div>
      )}
    </div>
  );
}
