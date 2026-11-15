import * as React from 'react';

import {
  normalizeFeaturePackError,
  type FeaturePackResource
} from '../feature-packs/shared/feature-pack-contracts';

/** What a scope panel renders: its resource, and the policy and actions the load found. */
export type ScopeView<Data, Policy, Actions> = Readonly<{
  resource: FeaturePackResource<Data>;
  policy?: Policy;
  actions?: Actions;
}>;

/**
 * A scope panel's view, loaded again on `reload` and whenever `load` changes
 * (memoize it on what it reads). A failure becomes the panel's error state,
 * with a retry; a load the panel no longer needs is dropped.
 */
export function useScopeView<Data, Policy, Actions>(
  load: (signal: AbortSignal, reload: () => void) => Promise<ScopeView<Data, Policy, Actions>>,
  failureMessage: string
): ScopeView<Data, Policy, Actions> {
  const [version, setVersion] = React.useState(0);
  const [view, setView] = React.useState<ScopeView<Data, Policy, Actions>>({ resource: { status: 'loading' } });

  React.useEffect(() => {
    const controller = new AbortController();
    const reload = () => setVersion((current) => current + 1);
    load(controller.signal, reload)
      .then((next) => {
        if (!controller.signal.aborted) setView(next);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setView({
          resource: { status: 'error', error: normalizeFeaturePackError(error, failureMessage), retry: reload }
        });
      });
    return () => controller.abort();
  }, [load, failureMessage, version]);

  return view;
}
