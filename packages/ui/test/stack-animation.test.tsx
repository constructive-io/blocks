import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const motionState = vi.hoisted(() => ({
  prefersReducedMotion: false,
  cardProps: [] as Array<Record<string, unknown>>,
}));

vi.mock('motion/react', async () => {
  const React = await vi.importActual<typeof import('react')>('react');

  return {
    motion: {
      div: React.forwardRef<HTMLDivElement, Record<string, unknown>>(function MotionDiv(props, ref) {
        const {
          initial,
          animate,
          exit,
          transition,
          onAnimationComplete,
          ...elementProps
        } = props;

        motionState.cardProps.push({
          initial,
          animate,
          exit,
          transition,
          onAnimationComplete,
        });

        return <div ref={ref} {...elementProps} />;
      }),
    },
    useReducedMotion: () => motionState.prefersReducedMotion,
  };
});

import { StackCard } from '../src/components/stack/stack-card';
import { CardStackProvider } from '../src/components/stack/stack-context';
import type { AnimationConfig, CardSpec } from '../src/components/stack/stack.types';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const activeRoots = new Set<Root>();

function TestCard() {
  return null;
}

const card: CardSpec = {
  id: 'settings',
  title: 'Settings',
  Component: TestCard,
};

async function renderCard(animation?: AnimationConfig) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  activeRoots.add(root);

  await act(async () => {
    root.render(
      <CardStackProvider initial={[card]}>
        <StackCard
          card={card}
          index={0}
          totalCards={1}
          topCardWidth={480}
          animation={animation}
          isLastCard
        />
      </CardStackProvider>,
    );
  });
}

function latestMotionProps() {
  const props = motionState.cardProps.at(-1);
  expect(props).toBeDefined();
  return props!;
}

beforeEach(() => {
  motionState.prefersReducedMotion = false;
  motionState.cardProps = [];
});

afterEach(async () => {
  for (const root of activeRoots) {
    await act(async () => root.unmount());
  }
  activeRoots.clear();
  document.body.replaceChildren();
});

describe('StackCard motion', () => {
  it('uses configured enter and exit tweens before settling onto the offset spring', async () => {
    const enterEase = [0.1, 0.2, 0.3, 1];
    const exitEase = [0.4, 0.3, 0.2, 1];

    await renderCard({ duration: 0.12, enterEase, exitEase });

    let props = latestMotionProps();
    expect(props.initial).toEqual({ x: '100%', opacity: 1 });
    expect(props.animate).toEqual({ x: 0, opacity: 1 });
    expect(props.transition).toEqual({
      type: 'tween',
      duration: 0.12,
      ease: enterEase,
    });
    expect(props.exit).toEqual({
      x: '100%',
      opacity: 0,
      transition: {
        type: 'tween',
        duration: 0.12,
        ease: exitEase,
      },
    });

    await act(async () => {
      (props.onAnimationComplete as (() => void) | undefined)?.();
    });

    props = latestMotionProps();
    expect(props.transition).toEqual({
      type: 'spring',
      stiffness: 300,
      damping: 30,
      mass: 0.8,
    });
  });

  it('settles entry and exit immediately when reduced motion is requested', async () => {
    motionState.prefersReducedMotion = true;

    await renderCard({ duration: 0.2 });

    const props = latestMotionProps();
    expect(props.initial).toEqual({ x: 0, opacity: 1 });
    expect(props.animate).toEqual({ x: 0, opacity: 1 });
    expect(props.transition).toEqual({ duration: 0 });
    expect(props.exit).toEqual({
      x: 0,
      opacity: 0,
      transition: { duration: 0 },
    });
  });
});
