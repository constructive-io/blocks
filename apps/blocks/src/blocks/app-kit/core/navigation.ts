export type AppRecordLocator<TRecord> = Readonly<{
  resourceId: string;
  identity: (record: TRecord) => string;
}>;

export type AppRecordTarget<TRecord> = Readonly<{
  resourceId: string;
  identity: string;
  record: TRecord;
}>;

function targetFor<TRecord>(
  locator: AppRecordLocator<TRecord>,
  record: TRecord
): AppRecordTarget<TRecord> {
  return {
    identity: locator.identity(record),
    record,
    resourceId: locator.resourceId
  };
}

export function createAppRouteRecordOpener<TRecord>(config: Readonly<{
  locator: AppRecordLocator<TRecord>;
  href: (target: AppRecordTarget<TRecord>) => string;
  navigate: (href: string, target: AppRecordTarget<TRecord>) => void;
}>): (record: TRecord) => void {
  return (record) => {
    const target = targetFor(config.locator, record);
    config.navigate(config.href(target), target);
  };
}

/**
 * Creates a Stack-compatible opener without importing Stack. The host decides
 * the card type and how it is opened, so App Kit remains router-independent.
 */
export function createAppStackRecordOpener<TRecord, TCard>(config: Readonly<{
  locator: AppRecordLocator<TRecord>;
  card: (target: AppRecordTarget<TRecord>) => TCard;
  open: (card: TCard, target: AppRecordTarget<TRecord>) => void;
}>): (record: TRecord) => void {
  return (record) => {
    const target = targetFor(config.locator, record);
    config.open(config.card(target), target);
  };
}

export type AppUrlStateAdapter<TState> = Readonly<{
  read: (search: string | URLSearchParams) => TState;
  write: (state: TState, current?: string | URLSearchParams) => URLSearchParams;
}>;

export function defineAppUrlStateAdapter<TState>(config: Readonly<{
  keys: readonly string[];
  decode: (params: URLSearchParams) => TState;
  encode: (state: TState) => URLSearchParams;
}>): AppUrlStateAdapter<TState> {
  const asParams = (value: string | URLSearchParams | undefined) =>
    value instanceof URLSearchParams
      ? new URLSearchParams(value)
      : new URLSearchParams(value?.startsWith('?') ? value.slice(1) : value);

  return Object.freeze({
    read(search: string | URLSearchParams) {
      return config.decode(asParams(search));
    },
    write(state: TState, current?: string | URLSearchParams) {
      const result = asParams(current);
      for (const key of config.keys) result.delete(key);
      const encoded = config.encode(state);
      for (const [key, value] of encoded) result.append(key, value);
      return result;
    }
  });
}
