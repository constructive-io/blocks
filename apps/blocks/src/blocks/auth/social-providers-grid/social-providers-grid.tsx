'use client';

/**
 * auth-social-providers-grid  (registry: auth-social-providers-grid)
 *
 * Standalone sign-in/sign-up surface — a prominent grid layout of OAuth
 * providers for primary sign-in and sign-up pages. Composition layer over
 * [[auth-social-buttons]] that adds:
 *   • Mode context ('sign-in' / 'sign-up') → drives button label template.
 *   • Outer divider with mode-aware label.
 *   • "Last used" badge on the provider the user previously authenticated with,
 *     read from `localStorage` key `cnc_last_auth_provider` (SSR-safe).
 *     Written on each `onProviderClick` before delegating navigation.
 *
 * DATA PATH — this block has NO direct data hook. Provider discovery is
 * fully delegated to [[auth-social-buttons]] (which imports
 * `useIdentityProvidersQuery` from `@/generated/auth`). This block is
 * presentational: no `requires.json`, no `blocks-runtime` direct dependency
 * (arrives transitively via auth-social-buttons).
 *
 * NO client bootstrap — never calls configure()/getClient() and never mounts
 * a QueryClientProvider. Wiring is done by the host's blocks-runtime once.
 */

import { useState, useEffect } from 'react';
import { Badge } from '@constructive-io/ui/badge';
import { Button } from '@constructive-io/ui/button';
import { Separator } from '@constructive-io/ui/separator';

import { cn } from '@/lib/utils';
import { AuthSocialButtons, type AuthSocialButtonsProps, type IdentityProvider } from '@/blocks/auth/social-buttons/social-buttons';

import {
  defaultSocialProvidersGridMessages,
  type SocialProvidersGridMessages,
  type SocialProvidersGridMessageOverrides
} from './messages';

// ─── Local-storage key ───────────────────────────────────────────────────────

const LAST_USED_KEY = 'cnc_last_auth_provider';

type LastUsedEntry = {
  slug: string;
  timestamp: number;
};

// ─── Interpolation helper ────────────────────────────────────────────────────

function interpolateProvider(template: string, providerName: string): string {
  return template.replace(/\{\{provider\}\}/g, providerName);
}

// ─── Props ───────────────────────────────────────────────────────────────────

export type AuthSocialProvidersGridProps = {
  /**
   * Context mode — controls button label ("Sign in with" vs "Sign up with").
   * Default: 'sign-in'
   */
  mode?: 'sign-in' | 'sign-up';
  /**
   * Show "Last used" badge on the provider the user previously authenticated with.
   * Reads / writes `cnc_last_auth_provider` in localStorage. Default: true.
   */
  showLastUsed?: boolean;
  /**
   * Static provider slug list — passed through to auth-social-buttons.
   * When set the DB query is skipped (see auth-social-buttons docs).
   */
  providers?: string[];
  /**
   * Button layout — passed through to auth-social-buttons.
   * Default: 'stacked'
   */
  layout?: 'stacked' | 'grid' | 'icon-only';
  /**
   * Return URL passed to the OAuth middleware.
   * Defaults to current URL at click time.
   */
  returnTo?: string;
  /**
   * Show the outer divider above the button group. Default: true.
   * auth-social-buttons' own divider is suppressed here (showDivider=false)
   * so only this block's divider renders.
   */
  showDivider?: boolean;
  /**
   * Override OAuth middleware base path. Default: '/auth'
   */
  baseOAuthPath?: string;
  /**
   * Custom render function for each button — passed through to auth-social-buttons.
   * When provided, the last-used badge overlay is skipped (defer to the host).
   */
  renderButton?: AuthSocialButtonsProps['renderButton'];
  /**
   * Called before OAuth navigation fires (forwarded from auth-social-buttons).
   * The block writes the last-used provider to localStorage here.
   * Return false to cancel navigation.
   */
  onProviderClick?: (provider: IdentityProvider, url: string) => boolean | void;
  messages?: SocialProvidersGridMessageOverrides;
  onError?: (err: unknown) => void;
  onMessage?: (event: { kind: 'success' | 'error' | 'info' | 'warning'; key: string; message?: string }) => void;
  className?: string;
};

// ─── Component ───────────────────────────────────────────────────────────────

export function AuthSocialProvidersGrid({
  mode = 'sign-in',
  showLastUsed = true,
  providers,
  layout = 'stacked',
  returnTo,
  showDivider = true,
  baseOAuthPath = '/auth',
  renderButton,
  onProviderClick,
  messages: messageOverrides,
  onError,
  onMessage,
  className
}: AuthSocialProvidersGridProps) {
  // Deep merge: top-level copy + errors map separately.
  const merged: SocialProvidersGridMessages = {
    ...defaultSocialProvidersGridMessages,
    ...messageOverrides,
    errors: { ...defaultSocialProvidersGridMessages.errors, ...messageOverrides?.errors }
  };

  // Last-used slug — only read from localStorage inside useEffect (SSR-safe).
  const [lastUsedSlug, setLastUsedSlug] = useState<string | null>(null);

  useEffect(() => {
    if (!showLastUsed) return;
    try {
      const raw = localStorage.getItem(LAST_USED_KEY);
      if (raw) {
        const entry = JSON.parse(raw) as LastUsedEntry;
        if (typeof entry?.slug === 'string') setLastUsedSlug(entry.slug);
      }
    } catch {
      // Ignore JSON / storage errors — degrade silently
    }
  }, [showLastUsed]);

  // Write last-used entry when a provider is clicked, then forward to the
  // host-supplied onProviderClick (if any). Mirrors AuthSocialButtons navigation:
  // if onProviderClick does not return false, navigate via window.location.href.
  function handleProviderClick(provider: IdentityProvider, url: string): boolean | void {
    if (showLastUsed) {
      try {
        const entry: LastUsedEntry = { slug: provider.slug, timestamp: Date.now() };
        localStorage.setItem(LAST_USED_KEY, JSON.stringify(entry));
        setLastUsedSlug(provider.slug);
      } catch {
        // localStorage write failure is non-fatal
      }
    }
    const shouldNavigate = onProviderClick?.(provider, url);
    if (shouldNavigate === false) return false;
    if (typeof window !== 'undefined') {
      window.location.href = url;
    }
  }

  // Build OAuth URL (mirrors logic inside AuthSocialButtons — needed to pass the
  // correct url to the custom renderButton's onClick handler).
  function buildOAuthUrl(slug: string): string {
    const base = (baseOAuthPath ?? '/auth').replace(/\/$/, '');
    const ret = returnTo ?? (typeof window !== 'undefined' ? window.location.href : '/');
    return `${base}/${slug}?return_to=${encodeURIComponent(ret)}`;
  }

  // If the host supplied a custom renderButton, pass it straight through —
  // no badge injection (the host owns the full button rendering).
  // Otherwise, for the last-used provider we render the default button style
  // plus the badge; for all others we return null (AuthSocialButtons falls back
  // to its own default rendering).
  const effectiveRenderButton: AuthSocialButtonsProps['renderButton'] =
    renderButton ??
    (showLastUsed && lastUsedSlug
      ? (provider: IdentityProvider) => {
          if (provider.slug !== lastUsedSlug) return null;
          const label =
            mode === 'sign-up'
              ? interpolateProvider(merged.signUpWith, provider.displayName)
              : interpolateProvider(merged.signInWith, provider.displayName);

          return (
            <div key={provider.slug} className="relative">
              {/* Badge positioned above the right edge of the button */}
              <div className="absolute -top-2 right-2 z-10 pointer-events-none">
                <Badge
                  variant="secondary"
                  className="text-[10px] px-1.5 py-0.5 leading-none"
                  aria-hidden="true"
                >
                  {merged.lastUsedBadge}
                </Badge>
              </div>
              <Button
                type="button"
                variant="outline"
                className="w-full justify-start gap-3"
                aria-label={`${label} (${merged.lastUsedBadge})`}
                data-testid={`social-btn-${provider.slug}`}
                onClick={() => handleProviderClick(provider, buildOAuthUrl(provider.slug))}
              >
                <span>{label}</span>
              </Button>
            </div>
          );
        }
      : undefined);

  return (
    <div data-slot="social-providers-grid" className={cn('w-full max-w-sm mx-auto', className)}>
      {showDivider && (
        <div className="flex items-center gap-3 py-3">
          <Separator className="flex-1" aria-hidden="true" />
          <span className="text-muted-foreground text-xs">{merged.dividerText}</span>
          <Separator className="flex-1" aria-hidden="true" />
        </div>
      )}

      <AuthSocialButtons
        providers={providers}
        mode={mode}
        layout={layout}
        showDivider={false}
        returnTo={returnTo}
        baseOAuthPath={baseOAuthPath}
        renderButton={effectiveRenderButton}
        onProviderClick={handleProviderClick}
        messages={{
          signInWith: merged.signInWith,
          signUpWith: merged.signUpWith,
          errors: merged.errors
        }}
        onError={onError}
        onMessage={onMessage}
      />
    </div>
  );
}
