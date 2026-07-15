import '@testing-library/jest-dom';
import { afterEach, beforeEach } from 'vitest';

// React act() environment flag (recommended by the React team).
// @ts-expect-error globalThis is untyped here
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// @base-ui/react components render into a portal — give each test a fresh root.
beforeEach(() => {
  document.getElementById('portal-root')?.remove();
  const portalRoot = document.createElement('div');
  portalRoot.id = 'portal-root';
  document.body.appendChild(portalRoot);
});

afterEach(() => {
  document.getElementById('portal-root')?.remove();
});

// jsdom does not implement scrollTo.
Element.prototype.scrollTo = function scrollTo() {};

// Base UI dispatches PointerEvent instances from its checkbox implementation.
// jsdom does not expose PointerEvent, but MouseEvent implements the event shape
// these tests exercise.
if (!window.PointerEvent) {
  window.PointerEvent = MouseEvent as typeof PointerEvent;
}
