'use client';

import dynamic from 'next/dynamic';
import { createContext, useContext, useEffect, useState } from 'react';

import { DEFAULT_SPRING_TIERS, setSpringTiers, type SpringTiers } from '@constructive-io/ui';

import {
  isPreviewMessage,
  postPreviewReady,
  sanitizePreviewDraft,
  sanitizePreviewWall,
} from '@/lib/theme-playground/channel';
import {
  DEFAULT_DRAFT,
  decodeDraft,
  previewStyleSheet,
  type ColorMode,
  type ThemeDraft,
} from '@/lib/theme-playground/draft';
import { wallFromSearch, type WallId } from '@/lib/theme-playground/walls';

const STYLE_TAG_ID = 'constructive-theme-preview';

const PreviewDraftContext = createContext<ThemeDraft>(DEFAULT_DRAFT);

/** The draft currently driving the preview — read by cards that show live theme output. */
export function usePreviewThemeDraft(): ThemeDraft {
  return useContext(PreviewDraftContext);
}

function initialDraft(): ThemeDraft {
  const encoded = new URLSearchParams(window.location.search).get('d');
  return encoded ? decodeDraft(encoded) : { ...DEFAULT_DRAFT };
}

/**
 * Initial draft from `?d=` and wall from `?wall=`, then live updates from the
 * host via postMessage. Announces PREVIEW_READY once mounted so the host can
 * start streaming drafts.
 */
function usePreviewDraft(): { draft: ThemeDraft | null; wall: WallId } {
  const [draft, setDraft] = useState<ThemeDraft | null>(null);
  const [wall, setWall] = useState<WallId>(() =>
    typeof window === 'undefined' ? wallFromSearch('') : wallFromSearch(window.location.search),
  );

  useEffect(() => {
    setDraft(initialDraft());
    setWall(wallFromSearch(window.location.search));

    const onMessage = (event: MessageEvent) => {
      if (!isPreviewMessage(event, window.parent)) return;
      setDraft(sanitizePreviewDraft(event.data));
      setWall(sanitizePreviewWall(event.data));
    };
    window.addEventListener('message', onMessage);
    if (window.parent !== window) {
      postPreviewReady(window.parent);
    }
    return () => window.removeEventListener('message', onMessage);
  }, []);

  return { draft, wall };
}

/**
 * Owns `<html class>` + `color-scheme` inside the iframe. The root layout's
 * next-themes provider also writes that class, so we re-assert through a
 * MutationObserver — equality guards keep the observer from looping.
 */
function useForcedColorMode(mode: ColorMode) {
  useEffect(() => {
    const html = document.documentElement;
    const media = window.matchMedia('(prefers-color-scheme: dark)');

    const apply = () => {
      const dark = mode === 'dark' || (mode === 'system' && media.matches);
      if (html.classList.contains('dark') !== dark) html.classList.toggle('dark', dark);
      const scheme = dark ? 'dark' : 'light';
      if (html.style.colorScheme !== scheme) html.style.colorScheme = scheme;
    };

    apply();
    media.addEventListener('change', apply);
    const observer = new MutationObserver(apply);
    observer.observe(html, { attributes: true, attributeFilter: ['class', 'style'] });
    return () => {
      media.removeEventListener('change', apply);
      observer.disconnect();
    };
  }, [mode]);
}

/** `<style>` override sheet in <head> — appended after globals so it wins. */
function useThemeOverrideSheet(draft: ThemeDraft | null) {
  useEffect(() => {
    if (!draft) return;
    let el = document.getElementById(STYLE_TAG_ID) as HTMLStyleElement | null;
    if (!el) {
      el = document.createElement('style');
      el.id = STYLE_TAG_ID;
      document.head.appendChild(el);
    }
    el.textContent = previewStyleSheet(draft);
  }, [draft]);

  useEffect(() => () => document.getElementById(STYLE_TAG_ID)?.remove(), []);
}

/**
 * Widgets like cmdk call `scrollIntoView`/focus-driven scrolling on mount,
 * which scrolls the preview document to the selected item in a narrow iframe.
 * Inner scroll containers keep scrolling; the document's scroll position is
 * pinned by restoring it after every call (same approach as shadcn's
 * PreventScrollOnFocusScript for focus).
 */
function usePreviewScrollGuard() {
  useEffect(() => {
    const originalScrollIntoView = Element.prototype.scrollIntoView;
    const originalFocus = HTMLElement.prototype.focus;

    Element.prototype.scrollIntoView = function (this: Element, arg?: boolean | ScrollIntoViewOptions) {
      const x = window.scrollX;
      const y = window.scrollY;
      if (typeof arg === 'boolean') {
        originalScrollIntoView.call(this, arg);
      } else {
        originalScrollIntoView.call(this, { ...arg, behavior: 'instant' });
      }
      window.scrollTo(x, y);
    };

    HTMLElement.prototype.focus = function (this: HTMLElement, options?: FocusOptions) {
      originalFocus.call(this, { ...options, preventScroll: true });
    };

    return () => {
      Element.prototype.scrollIntoView = originalScrollIntoView;
      HTMLElement.prototype.focus = originalFocus;
    };
  }, []);
}

/** Apply the draft's absolute spring tiers; restore defaults on unmount. */
function useMotionTiers(tiers: SpringTiers) {
  useEffect(() => {
    setSpringTiers(tiers);
    return () => setSpringTiers(DEFAULT_SPRING_TIERS);
  }, [tiers]);
}

const WALL_COMPONENTS = {
  platform: dynamic(() => import('./canvas/wall-platform').then((m) => m.WallPlatform), {
    loading: () => null,
  }),
  workspace: dynamic(() => import('./canvas/wall-workspace').then((m) => m.WallWorkspace), {
    loading: () => null,
  }),
  assistant: dynamic(() => import('./canvas/wall-assistant').then((m) => m.WallAssistant), {
    loading: () => null,
  }),
} as const;

export function ThemePreviewDocument() {
  const { draft, wall } = usePreviewDraft();
  usePreviewScrollGuard();
  useForcedColorMode(draft?.mode ?? 'system');
  useThemeOverrideSheet(draft);
  useMotionTiers(draft?.tiers ?? DEFAULT_DRAFT.tiers);

  if (!draft) return null;
  const Wall = WALL_COMPONENTS[wall];
  return (
    <PreviewDraftContext.Provider value={draft}>
      <Wall />
    </PreviewDraftContext.Provider>
  );
}
