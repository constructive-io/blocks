import type { ScrapedNode } from './chat.types';

const MAX_NODES = 50;
const ATTR_PREFIX = 'data-chat-';
const COMPONENT_ATTR = 'data-chat-component';

export function scrapePageContext(): ScrapedNode[] {
  if (typeof document === 'undefined') return [];

  const elements = document.querySelectorAll(`[${COMPONENT_ATTR}]`);
  const nodes: ScrapedNode[] = [];

  for (const el of elements) {
    if (nodes.length >= MAX_NODES) break;

    if (!(el as HTMLElement).offsetParent && (el as HTMLElement).style.position !== 'fixed') continue;

    const component = el.getAttribute(COMPONENT_ATTR);
    if (!component) continue;

    const attributes: Record<string, string> = {};
    for (const attr of el.attributes) {
      if (attr.name.startsWith(ATTR_PREFIX) && attr.name !== COMPONENT_ATTR) {
        const key = attr.name.slice(ATTR_PREFIX.length);
        attributes[key] = attr.value;
      }
    }

    nodes.push({ component, attributes });
  }

  return nodes;
}
