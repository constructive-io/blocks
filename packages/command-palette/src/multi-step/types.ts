import type * as React from 'react';

/** Status of an individual step in a multi-step flow */
export type StepStatus = 'idle' | 'active' | 'loading' | 'error' | 'complete';

/** Props passed to each step's Component */
export interface StepViewProps<TContext, TStepData = undefined> {
  /** Accumulated context from previous steps (read-only) */
  context: Readonly<TContext>;
  /** Data loaded by this step's loader (undefined if no loader) */
  data: TStepData;
  /** Call when the step is done — merges output into context and advances */
  onComplete: (output: Partial<TContext>) => void;
  /** Navigate to previous step */
  onBack: () => void;
  /** Skip this step (only if step.skippable) */
  onSkip: () => void;
  /** Report an error for this step */
  onError: (error: Error | string) => void;
  /** Current status of this step */
  status: StepStatus;
  /** Error object if status === 'error' */
  error: Error | null;
  /** Whether this is the first step */
  isFirst: boolean;
  /** Whether this is the last step */
  isLast: boolean;
  /** Zero-based index of this step */
  stepIndex: number;
  /** Total number of steps */
  totalSteps: number;
}

/** Definition of a single step in a multi-step command */
export interface StepDefinition<TContext, TStepData = undefined> {
  /** Unique step identifier */
  id: string;
  /** Display title for the step header */
  title: string;
  /** Optional description shown below the title */
  description?: string;
  /** Optional icon for the step header */
  icon?: React.ComponentType<{ className?: string }>;
  /** React component that renders the step content */
  Component: React.ComponentType<StepViewProps<TContext, TStepData>>;
  /** Async loader — fetches data for this step based on accumulated context */
  loader?: (context: Readonly<TContext>) => Promise<TStepData>;
  /** Validate context before advancing. Return true or an error message string. */
  validate?: (context: Readonly<TContext>) => true | string;
  /** Whether this step can be skipped */
  skippable?: boolean;
}

/** Configuration for a multi-step command */
export interface MultiStepConfig<TContext> {
  /** Ordered list of steps */
  steps: StepDefinition<TContext, any>[];
  /** Initial context values */
  initialContext?: Partial<TContext>;
  /** Called when the last step completes successfully */
  onComplete?: (context: TContext) => void | Promise<void>;
  /** Called when the user cancels the flow */
  onCancel?: (context: Partial<TContext>, stepIndex: number) => void;
}
