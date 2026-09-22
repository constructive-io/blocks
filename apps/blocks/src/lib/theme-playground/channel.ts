import { sanitizeDraft, type ThemeDraft } from './draft';
import { sanitizeWall, type WallId } from './walls';

/**
 * postMessage protocol between the /blocks/create host and the preview iframe.
 * Same-origin only; draft payloads are sanitised before use.
 */

export const PREVIEW_MESSAGE = 'constructive:theme-preview';
export const PREVIEW_READY_MESSAGE = 'constructive:theme-preview-ready';

export interface PreviewMessage {
  type: typeof PREVIEW_MESSAGE;
  draft: ThemeDraft;
  wall: WallId;
}

export interface PreviewReadyMessage {
  type: typeof PREVIEW_READY_MESSAGE;
}

export function postPreviewDraft(target: Window, draft: ThemeDraft, wall: WallId) {
  const message: PreviewMessage = { type: PREVIEW_MESSAGE, draft, wall };
  target.postMessage(message, window.location.origin);
}

export function postPreviewReady(target: Window) {
  const message: PreviewReadyMessage = { type: PREVIEW_READY_MESSAGE };
  target.postMessage(message, window.location.origin);
}

/** Type guard for incoming preview-draft messages. */
export function isPreviewMessage(
  event: MessageEvent,
  expectedSource?: Window | null,
): event is MessageEvent<PreviewMessage> {
  if (typeof window === 'undefined') return false;
  if (event.origin !== window.location.origin) return false;
  if (event.data?.type !== PREVIEW_MESSAGE) return false;
  if (expectedSource !== undefined && event.source !== expectedSource) return false;
  return true;
}

/** Type guard for the iframe's ready announcement. */
export function isPreviewReadyMessage(
  event: MessageEvent,
  expectedSource?: Window | null,
): event is MessageEvent<PreviewReadyMessage> {
  if (typeof window === 'undefined') return false;
  if (event.origin !== window.location.origin) return false;
  if (event.data?.type !== PREVIEW_READY_MESSAGE) return false;
  if (expectedSource !== undefined && event.source !== expectedSource) return false;
  return true;
}

/** Sanitise a raw postMessage draft payload. */
export function sanitizePreviewDraft(payload: unknown): ThemeDraft {
  const draft = (payload as { draft?: unknown } | null)?.draft;
  return sanitizeDraft(draft);
}

/** Sanitise the `wall` field of a preview message — falls back to the default wall. */
export function sanitizePreviewWall(payload: unknown): WallId {
  return sanitizeWall((payload as { wall?: unknown } | null)?.wall);
}
