import { useCallback, useEffect, useRef, useState } from 'react';

export type Machine<State, Event> = {
  initial: State;
  transition: (state: State, event: Event) => TransitionResult<State, Event>;
};

export type TransitionResult<State, Event> = {
  state: State;
  effects?: Effect<Event>[];
};

export type Effect<Event> =
  | {
      type: 'invoke';
      id: string;
      fn: () => Promise<unknown>;
      onDone: (data: unknown) => Event;
      onError: (error: Error) => Event;
    }
  | {
      type: 'action';
      fn: (send: (event: Event) => void) => void;
    }
  | {
      type: 'cancel';
      id: string;
    };

export interface UseMachineOptions<State, Event> {
  onTransition?: (state: State, event: Event) => void;
}

const EMPTY_EFFECTS: Effect<never>[] = [];

export function useMachine<State, Event>(
  machine: Machine<State, Event>,
  options?: UseMachineOptions<State, Event>
) {
  const [state, setState] = useState(machine.initial);
  const [effects, setEffects] = useState<Effect<Event>[]>([]);
  const stateRef = useRef(state);
  const inflightRef = useRef(new Map<string, { cancelled: boolean }>());
  const transitionRef = useRef(machine.transition);
  transitionRef.current = machine.transition;
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const send = useCallback(
    (event: Event) => {
      const result = transitionRef.current(stateRef.current, event);
      stateRef.current = result.state;
      setState(result.state);
      setEffects(result.effects ?? (EMPTY_EFFECTS as Effect<Event>[]));
      optionsRef.current?.onTransition?.(result.state, event);
    },
    []
  );

  useEffect(() => {
    if (effects.length === 0) return;

    const cancelTokens: Array<() => void> = [];

    for (const effect of effects) {
      if (effect.type === 'cancel') {
        const token = inflightRef.current.get(effect.id);
        if (token) token.cancelled = true;
        inflightRef.current.delete(effect.id);
        continue;
      }

      if (effect.type === 'action') {
        effect.fn(send);
        continue;
      }

      if (effect.type === 'invoke') {
        const token = { cancelled: false };
        inflightRef.current.set(effect.id, token);

        effect
          .fn()
          .then((data) => {
            if (!token.cancelled) send(effect.onDone(data));
          })
          .catch((error: unknown) => {
            if (!token.cancelled) {
              send(effect.onError(error instanceof Error ? error : new Error(String(error))));
            }
          });

        cancelTokens.push(() => {
          token.cancelled = true;
          inflightRef.current.delete(effect.id);
        });
      }
    }

    return () => {
      cancelTokens.forEach((cancel) => cancel());
    };
  }, [effects, send]);

  useEffect(() => {
    return () => {
      inflightRef.current.forEach((token) => {
        token.cancelled = true;
      });
      inflightRef.current.clear();
    };
  }, []);

  return { state, send };
}
