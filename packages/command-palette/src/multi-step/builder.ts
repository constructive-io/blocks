import type { CommandDefinition } from '../types';
import type { StepDefinition, MultiStepConfig } from './types';

/**
 * Fluent builder for multi-step commands.
 *
 * Usage:
 *   multiStepCommand<MyCtx>({ id: 'x', label: 'X', group: 'g' })
 *     .step({ id: 's1', title: 'Step 1', Component: S1 })
 *     .step({ id: 's2', title: 'Step 2', Component: S2 })
 *     .onComplete(ctx => save(ctx))
 *     .build()
 */
export interface MultiStepBuilder<TContext> {
  step<TStepData = undefined>(
    def: StepDefinition<TContext, TStepData>
  ): MultiStepBuilder<TContext>;
  initialContext(ctx: Partial<TContext>): MultiStepBuilder<TContext>;
  onComplete(
    fn: (ctx: TContext) => void | Promise<void>
  ): MultiStepBuilder<TContext>;
  onCancel(
    fn: (ctx: Partial<TContext>, stepIndex: number) => void
  ): MultiStepBuilder<TContext>;
  build(): CommandDefinition;
}

export function multiStepCommand<TContext>(
  base: Omit<CommandDefinition, 'type' | 'multiStep' | 'onSelect'>
): MultiStepBuilder<TContext> {
  const steps: StepDefinition<TContext, any>[] = [];
  let _initialContext: Partial<TContext> | undefined;
  let _onComplete: ((ctx: TContext) => void | Promise<void>) | undefined;
  let _onCancel:
    | ((ctx: Partial<TContext>, stepIndex: number) => void)
    | undefined;

  const builder: MultiStepBuilder<TContext> = {
    step(def) {
      steps.push(def);
      return builder;
    },
    initialContext(ctx) {
      _initialContext = ctx;
      return builder;
    },
    onComplete(fn) {
      _onComplete = fn;
      return builder;
    },
    onCancel(fn) {
      _onCancel = fn;
      return builder;
    },
    build() {
      if (steps.length === 0) {
        throw new Error(
          `[command-palette] multiStepCommand "${base.id}": at least one step is required`
        );
      }

      const ids = new Set<string>();
      for (const step of steps) {
        if (ids.has(step.id)) {
          throw new Error(
            `[command-palette] multiStepCommand "${base.id}": duplicate step id "${step.id}"`
          );
        }
        ids.add(step.id);
      }

      const config: MultiStepConfig<TContext> = {
        steps,
        initialContext: _initialContext,
        onComplete: _onComplete,
        onCancel: _onCancel,
      };

      return {
        ...base,
        type: 'multi-step' as const,
        multiStep: config,
      };
    },
  };

  return builder;
}
