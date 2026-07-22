import * as React from 'react';

/** Stable callback whose implementation only advances after React commits. */
export function useLatestCallback<Args extends readonly unknown[], Result>(
  callback: (...args: Args) => Result
): (...args: Args) => Result {
  const callbackRef = React.useRef(callback);
  React.useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);
  return React.useCallback(
    (...args: Args) => callbackRef.current(...args),
    []
  );
}
