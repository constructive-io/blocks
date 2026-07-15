import { StrictMode, memo, useEffect, type ReactNode } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MotionConfig } from 'motion/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { NavMenu, NavMenuItem, useNavMenu } from '@/components/docs/nav-menu';

vi.mock('next/link', async () => {
  const React = await vi.importActual<typeof import('react')>('react');

  return {
    default: React.forwardRef<HTMLAnchorElement, React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }>(
      ({ href, ...props }, ref) => React.createElement('a', { ...props, href, ref })
    ),
  };
});

vi.mock('motion/react', async () => {
  const React = await vi.importActual<typeof import('react')>('react');
  const ReducedMotionContext = React.createContext('never');

  type MotionDivProps = React.HTMLAttributes<HTMLDivElement> & {
    animate?: Record<string, unknown>;
    exit?: Record<string, unknown>;
    initial?: false | Record<string, unknown>;
    transition?: Record<string, unknown>;
  };

  const MotionDiv = React.forwardRef<HTMLDivElement, MotionDivProps>(
    ({ animate, exit, initial, style, transition: _transition, ...props }, ref) => {
      const reducedMotion = React.useContext(ReducedMotionContext);
      const instance = React.useId();

      return React.createElement('div', {
        ...props,
        ref,
        style,
        'data-motion-animate': JSON.stringify(animate),
        'data-motion-exit': JSON.stringify(exit),
        'data-motion-initial': JSON.stringify(initial),
        'data-motion-instance': instance,
        'data-motion-reduced-motion': reducedMotion,
        'data-motion-style': JSON.stringify(style),
      });
    }
  );

  return {
    AnimatePresence: ({ children }: { children: ReactNode }) => children,
    MotionConfig: ({ children, reducedMotion = 'never' }: { children: ReactNode; reducedMotion?: string }) =>
      React.createElement(ReducedMotionContext.Provider, { value: reducedMotion }, children),
    motion: { div: MotionDiv },
  };
});

type MenuItem = {
  href: string;
  index: number;
  label: string;
};

const ITEMS: MenuItem[] = [
  { href: '/showcase', index: 0, label: 'Showcase' },
  { href: '/introduction', index: 1, label: 'Introduction' },
  { href: '/guide', index: 2, label: 'Guide' },
];

let animationFrames: Map<number, FrameRequestCallback>;
let nextAnimationFrameId: number;

function renderItems(items: MenuItem[]) {
  return items.map((item) => <NavMenuItem key={item.href} {...item} />);
}

function flushAnimationFrames() {
  act(() => {
    for (let pass = 0; animationFrames.size > 0 && pass < 10; pass++) {
      const callbacks = [...animationFrames.values()];
      animationFrames.clear();
      callbacks.forEach((callback) => callback(pass * 16));
    }
  });
}

function expectActiveRoute(label: string) {
  const links = screen.getAllByRole('link');
  const activeLink = screen.getByRole('link', { name: label });

  expect(activeLink).toHaveAttribute('aria-current', 'page');
  expect(activeLink).toHaveAttribute('tabindex', '0');
  links.filter((link) => link !== activeLink).forEach((link) => expect(link).toHaveAttribute('tabindex', '-1'));
}

function motionTarget(element: Element) {
  return JSON.parse(element.getAttribute('data-motion-animate') ?? 'null') as Record<string, unknown> | null;
}

function ContextProbe({ onValue }: { onValue: (value: ReturnType<typeof useNavMenu>) => void }) {
  const value = useNavMenu();

  useEffect(() => {
    onValue(value);
  }, [onValue, value]);

  return null;
}

const MemoContextProbe = memo(ContextProbe);

beforeEach(() => {
  animationFrames = new Map();
  nextAnimationFrameId = 0;

  vi.stubGlobal(
    'requestAnimationFrame',
    vi.fn((callback: FrameRequestCallback) => {
      const id = ++nextAnimationFrameId;
      animationFrames.set(id, callback);
      return id;
    })
  );
  vi.stubGlobal(
    'cancelAnimationFrame',
    vi.fn((id: number) => {
      animationFrames.delete(id);
    })
  );

  vi.spyOn(HTMLElement.prototype, 'offsetTop', 'get').mockImplementation(function (this: HTMLElement) {
    const index = this.getAttribute('data-nav-index');
    return index === null ? 0 : Number(index) * 36;
  });
  vi.spyOn(HTMLElement.prototype, 'offsetLeft', 'get').mockImplementation(function (this: HTMLElement) {
    return this.hasAttribute('data-nav-index') ? 6 : 0;
  });
  vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(function (this: HTMLElement) {
    return this.hasAttribute('data-nav-index') ? 32 : 108;
  });
  vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockImplementation(function (this: HTMLElement) {
    return this.hasAttribute('data-nav-index') ? 188 : 200;
  });
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    const width = this instanceof HTMLElement && this.tagName === 'NAV' ? 200 : 188;
    const height = this instanceof HTMLElement && this.tagName === 'NAV' ? 108 : 32;
    return {
      bottom: 10 + height,
      height,
      left: 20,
      right: 20 + width,
      top: 10,
      width,
      x: 20,
      y: 10,
      toJSON: () => ({}),
    };
  });

  const nativeMatches = Element.prototype.matches;
  vi.spyOn(Element.prototype, 'matches').mockImplementation(function (this: Element, selector) {
    if (selector === ':focus-visible') return document.activeElement === this;
    return nativeMatches.call(this, selector);
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('NavMenu', () => {
  it('commits route registrations for initial, changed, removed, and replacement children', () => {
    const view = render(
      <NavMenu activeSlug="/introduction" data-testid="menu">
        {renderItems(ITEMS)}
      </NavMenu>
    );

    flushAnimationFrames();
    expectActiveRoute('Introduction');
    expect(motionTarget(view.container.querySelector('.bg-active')!)).toMatchObject({ x: 6, y: 36 });

    view.rerender(
      <NavMenu activeSlug="/showcase" data-testid="menu">
        {renderItems(ITEMS)}
      </NavMenu>
    );

    flushAnimationFrames();
    expectActiveRoute('Showcase');
    expect(motionTarget(view.container.querySelector('.bg-active')!)).toMatchObject({ x: 6, y: 0 });

    const withoutGuide = ITEMS.slice(0, 2);
    view.rerender(
      <NavMenu activeSlug="/guide" data-testid="menu">
        {renderItems(withoutGuide)}
      </NavMenu>
    );

    flushAnimationFrames();
    expect(screen.queryByRole('link', { name: 'Guide' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Showcase' })).toHaveAttribute('tabindex', '0');
    expect(screen.getByRole('link', { name: 'Introduction' })).toHaveAttribute('tabindex', '-1');
    expect(view.container.querySelector('.bg-active')).not.toBeInTheDocument();

    const withReplacement = [
      ITEMS[0],
      { href: '/getting-started', index: 1, label: 'Getting started' },
    ];
    view.rerender(
      <NavMenu activeSlug="/getting-started" data-testid="menu">
        {renderItems(withReplacement)}
      </NavMenu>
    );

    flushAnimationFrames();
    expect(screen.queryByRole('link', { name: 'Introduction' })).not.toBeInTheDocument();
    expectActiveRoute('Getting started');
    expect(motionTarget(view.container.querySelector('.bg-active')!)).toMatchObject({ x: 6, y: 36 });
  });

  it('keeps its context stable after Strict Mode registration and preserves keyboard focus movement', () => {
    const contextValues: Array<ReturnType<typeof useNavMenu>> = [];
    const onContextValue = (value: ReturnType<typeof useNavMenu>) => contextValues.push(value);
    const children = (
      <>
        {renderItems(ITEMS.slice(0, 2))}
        <MemoContextProbe onValue={onContextValue} />
      </>
    );
    const view = render(
      <StrictMode>
        <NavMenu activeSlug="/introduction" data-testid="menu">
          {children}
        </NavMenu>
      </StrictMode>
    );

    flushAnimationFrames();
    expectActiveRoute('Introduction');
    const settledContext = contextValues.at(-1);
    const settledRenderCount = contextValues.length;
    expect(settledContext?.activeRouteIndex).toBe(1);

    view.rerender(
      <StrictMode>
        <NavMenu activeSlug="/introduction" className="test-rerender" data-testid="menu">
          {children}
        </NavMenu>
      </StrictMode>
    );

    flushAnimationFrames();
    expect(contextValues).toHaveLength(settledRenderCount);
    expect(contextValues.at(-1)).toBe(settledContext);

    const introduction = screen.getByRole('link', { name: 'Introduction' });
    const showcase = screen.getByRole('link', { name: 'Showcase' });
    act(() => introduction.focus());
    fireEvent.keyDown(introduction, { key: 'ArrowDown' });

    expect(showcase).toHaveFocus();
    expect(introduction).toHaveAttribute('tabindex', '0');
    expect(showcase).toHaveAttribute('tabindex', '-1');
    expect(motionTarget(view.container.querySelector('.z-20')!)).toMatchObject({ x: 4, y: -2 });
  });

  it('uses transform-only targets for route, hover, and focus across pointer sessions and reduced motion', () => {
    const view = render(
      <MotionConfig reducedMotion="user">
        <NavMenu activeSlug="/showcase" data-testid="menu">
          {renderItems(ITEMS)}
        </NavMenu>
      </MotionConfig>
    );

    flushAnimationFrames();
    const menu = screen.getByTestId('menu');
    const guide = screen.getByRole('link', { name: 'Guide' });
    act(() => guide.focus());
    fireEvent.mouseEnter(menu);
    fireEvent.mouseMove(menu, { clientX: 30, clientY: 60 });
    flushAnimationFrames();

    const firstHover = view.container.querySelector('.bg-hover')!;
    const firstHoverInstance = firstHover.getAttribute('data-motion-instance');
    expect(motionTarget(firstHover)).toMatchObject({ opacity: 1, x: 6, y: 36 });
    expect(motionTarget(view.container.querySelector('.bg-active')!)).toMatchObject({ opacity: 0.8, x: 6, y: 0 });
    expect(motionTarget(view.container.querySelector('.z-20')!)).toMatchObject({ x: 4, y: 70 });

    fireEvent.mouseLeave(menu);
    expect(view.container.querySelector('.bg-hover')).not.toBeInTheDocument();
    expect(motionTarget(view.container.querySelector('.bg-active')!)).toMatchObject({ opacity: 1 });

    fireEvent.mouseEnter(menu);
    fireEvent.mouseMove(menu, { clientX: 30, clientY: 96 });
    flushAnimationFrames();

    const secondHover = view.container.querySelector('.bg-hover')!;
    expect(secondHover.getAttribute('data-motion-instance')).not.toBe(firstHoverInstance);
    expect(motionTarget(secondHover)).toMatchObject({ opacity: 1, x: 6, y: 72 });

    const layoutProperties = ['height', 'left', 'right', 'top', 'width'];
    const motionLayers = [...view.container.querySelectorAll<HTMLElement>('[data-motion-animate]')];
    expect(motionLayers).toHaveLength(3);

    motionLayers.forEach((layer) => {
      const animate = JSON.parse(layer.dataset.motionAnimate ?? '{}') as Record<string, unknown>;
      const initial = JSON.parse(layer.dataset.motionInitial ?? 'null') as Record<string, unknown> | null;
      expect(Object.keys(animate)).not.toEqual(expect.arrayContaining(layoutProperties));
      if (initial) expect(Object.keys(initial)).not.toEqual(expect.arrayContaining(layoutProperties));
      expect(layer).toHaveAttribute('data-motion-reduced-motion', 'user');
    });

    expect(JSON.parse(secondHover.getAttribute('data-motion-style') ?? '{}')).toEqual({ height: 32, width: 188 });
    expect(JSON.parse(view.container.querySelector('.z-20')!.getAttribute('data-motion-style') ?? '{}')).toEqual({
      height: 36,
      width: 192,
    });
  });
});
