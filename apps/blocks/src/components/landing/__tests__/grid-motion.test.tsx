import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GridMotionWall } from '@/components/landing/grid-motion';

const motionHarness = vi.hoisted(() => ({ reducedMotion: false }));
const gsapHarness = vi.hoisted(() => ({
  fromTo: vi.fn(),
  killTweensOf: vi.fn(),
  lagSmoothing: vi.fn(),
  marqueeKills: [] as Array<ReturnType<typeof vi.fn>>,
  quickSetters: [] as Array<ReturnType<typeof vi.fn>>,
  quickTo: vi.fn(),
  tickerAdd: vi.fn(),
}));

vi.mock('motion/react', () => ({
  useReducedMotion: () => motionHarness.reducedMotion,
}));

vi.mock('gsap', () => ({
  gsap: {
    fromTo: gsapHarness.fromTo,
    killTweensOf: gsapHarness.killTweensOf,
    quickTo: gsapHarness.quickTo,
    ticker: {
      add: gsapHarness.tickerAdd,
      lagSmoothing: gsapHarness.lagSmoothing,
    },
  },
}));

vi.mock('@/components/docs/showcase', () => ({
  DEMOS: { demo: () => null },
}));

vi.mock('@/components/docs/showcase-ui', () => ({ UI_DEMOS: {} }));

vi.mock('@/components/docs/preview-provider', () => ({
  PreviewProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('../showcase-manifest', () => ({
  SHOWCASE_ROWS: [['demo'], ['demo'], ['demo'], ['demo']],
}));

beforeEach(() => {
  motionHarness.reducedMotion = false;
  gsapHarness.marqueeKills.length = 0;
  gsapHarness.quickSetters.length = 0;
  vi.clearAllMocks();

  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1000 });
  gsapHarness.fromTo.mockImplementation(() => {
    const kill = vi.fn();
    gsapHarness.marqueeKills.push(kill);
    return { kill, pause: vi.fn(), play: vi.fn() };
  });
  gsapHarness.quickTo.mockImplementation(() => {
    const setTarget = vi.fn();
    gsapHarness.quickSetters.push(setTarget);
    return setTarget;
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('GridMotionWall inertia', () => {
  it('creates bounded setters, updates them from pointer targets, and cleans up every tween', () => {
    const removeEventListener = vi.spyOn(window, 'removeEventListener');
    const view = render(<GridMotionWall />);

    expect(gsapHarness.fromTo).toHaveBeenCalledTimes(4);
    expect(gsapHarness.fromTo.mock.calls[0][1]).toEqual({ xPercent: 0 });
    expect(gsapHarness.fromTo.mock.calls[0][2]).toMatchObject({
      duration: 64,
      ease: 'none',
      repeat: -1,
      xPercent: -50,
    });
    expect(gsapHarness.fromTo.mock.calls[1][1]).toEqual({ xPercent: -50 });
    expect(gsapHarness.fromTo.mock.calls[1][2]).toMatchObject({ duration: 78, xPercent: 0 });

    expect(gsapHarness.quickTo).toHaveBeenCalledTimes(4);
    expect(gsapHarness.quickTo.mock.calls.map((call) => call[1])).toEqual(['x', 'x', 'x', 'x']);
    [1.4, 1.2, 1.1, 1].forEach((duration, index) => {
      expect(gsapHarness.quickTo.mock.calls[index][2]?.duration).toBeCloseTo(duration);
    });
    expect(gsapHarness.quickTo.mock.calls.every((call) => call[2]?.ease === 'power3.out')).toBe(true);
    expect(gsapHarness.tickerAdd).not.toHaveBeenCalled();

    for (const setter of gsapHarness.quickSetters) {
      expect(setter).toHaveBeenCalledOnce();
      expect(setter.mock.calls[0][0]).toBeCloseTo(0);
    }

    fireEvent.mouseMove(window, { clientX: 750 });
    expect(gsapHarness.quickSetters.map((setter) => setter.mock.calls.at(-1)?.[0])).toEqual([40, -40, 40, -40]);
    expect(gsapHarness.quickTo).toHaveBeenCalledTimes(4);

    fireEvent.mouseMove(window, { clientX: 750 });
    expect(gsapHarness.quickSetters.every((setter) => setter.mock.calls.length === 2)).toBe(true);

    const callsBeforeUnmount = gsapHarness.quickSetters.map((setter) => setter.mock.calls.length);
    view.unmount();

    expect(removeEventListener).toHaveBeenCalledWith('mousemove', expect.any(Function));
    expect(gsapHarness.marqueeKills).toHaveLength(4);
    gsapHarness.marqueeKills.forEach((kill) => expect(kill).toHaveBeenCalledOnce());
    expect(gsapHarness.killTweensOf).toHaveBeenCalledTimes(4);

    fireEvent.mouseMove(window, { clientX: 900 });
    expect(gsapHarness.quickSetters.map((setter) => setter.mock.calls.length)).toEqual(callsBeforeUnmount);
  });

  it('creates no tweens, setters, listeners, or ticker work for reduced motion', () => {
    motionHarness.reducedMotion = true;
    const addEventListener = vi.spyOn(window, 'addEventListener');

    render(<GridMotionWall />);

    expect(gsapHarness.fromTo).not.toHaveBeenCalled();
    expect(gsapHarness.quickTo).not.toHaveBeenCalled();
    expect(gsapHarness.killTweensOf).not.toHaveBeenCalled();
    expect(gsapHarness.lagSmoothing).not.toHaveBeenCalled();
    expect(gsapHarness.tickerAdd).not.toHaveBeenCalled();
    expect(addEventListener).not.toHaveBeenCalledWith('mousemove', expect.any(Function));
  });
});
