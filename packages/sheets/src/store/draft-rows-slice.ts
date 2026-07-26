import type { RelationInfo } from './relation-info-slice';

type DraftRowStatus = 'idle' | 'saving' | 'error';

export interface DraftRow {
  id: string;
  values: Record<string, unknown>;
  status: DraftRowStatus;
  errors: Record<string, string> | null;
  createdAt: number;
  metaVersion: string;
}

interface DraftRowsTableState {
  order: string[];
  map: Record<string, DraftRow>;
  template: Record<string, unknown>;
  metaVersion: string;
  columnOrder: string[];
}

export function parseDraftTableKey(tableKey: string): { databaseId: string | null; tableName: string } | null {
  const parts = tableKey.split('::');
  if (parts.length === 2) {
    const [databaseId, tableName] = parts;
    if (!databaseId || !tableName) return null;
    return { databaseId, tableName };
  }
  return null;
}

export interface DraftRowCreationArgs {
  tableKey: string;
  columnOrder: readonly string[];
  fieldMetaByKey: Record<string, DraftFieldMetadata | undefined>;
  relationInfoByKey?: Record<string, RelationInfo | undefined>;
  metaVersion: string;
}

export type DraftRowsSyncArgs = DraftRowCreationArgs;

export interface DraftRowUpdateArgs {
  tableKey: string;
  draftRowId: string;
  columnKey: string;
  value: unknown;
  extraValues?: Record<string, unknown>;
}

export interface DraftRowsSlice {
  draftRowsByTable: Record<string, DraftRowsTableState | undefined>;
  createDraftRow: (args: DraftRowCreationArgs) => string;
  updateDraftCell: (args: DraftRowUpdateArgs) => void;
  removeDraftRow: (tableKey: string, draftRowId: string) => void;
  clearDraftRowsForTable: (tableKey: string) => void;
  clearDraftRowsForDatabase: (databaseId: string) => void;
  clearAllDraftRows: () => void;
  syncDraftRowsWithMeta: (args: DraftRowsSyncArgs) => void;
  setDraftRowStatus: (args: {
    tableKey: string;
    draftRowId: string;
    status: DraftRowStatus;
    errors?: Record<string, string> | null;
  }) => void;
}

type DraftFieldMetadata = {
  name?: string | null;
  isNotNull?: boolean | null;
  hasDefault?: boolean | null;
  type?: {
    gqlType?: string | null;
    isArray?: boolean | null;
    pgAlias?: string | null;
    pgType?: string | null;
    subtype?: string | null;
  } | null;
};

type DraftRowsSetState = (
	partial: Partial<DraftRowsSlice> | ((state: DraftRowsSlice) => Partial<DraftRowsSlice> | DraftRowsSlice),
) => void;

export function createDraftRowsSlice(set: DraftRowsSetState): DraftRowsSlice {
	return {
    draftRowsByTable: {},

    createDraftRow: (args) => {
      const { tableKey, columnOrder, fieldMetaByKey, relationInfoByKey, metaVersion } = args;

      const effectiveColumnOrder = ensureColumnOrder(columnOrder, fieldMetaByKey, relationInfoByKey);
      const template = buildTemplate(effectiveColumnOrder, relationInfoByKey);
      const draftRowId = `draft:${generateDraftSuffix()}`;
      const values = initializeValuesFromTemplate(template, draftRowId);

      set((state: DraftRowsSlice) => {
        const existing = state.draftRowsByTable[tableKey];

        const nextOrder = existing ? [...existing.order, draftRowId] : [draftRowId];
        const nextMap = {
          ...(existing?.map ?? {}),
          [draftRowId]: {
            id: draftRowId,
            values,
            status: 'idle' as const,
            errors: null,
            createdAt: Date.now(),
            metaVersion,
          },
        };

        return {
          draftRowsByTable: {
            ...state.draftRowsByTable,
            [tableKey]: {
              order: nextOrder,
              map: nextMap,
              template,
              metaVersion,
              columnOrder: [...effectiveColumnOrder],
            },
          },
        };
      });

      return draftRowId;
    },

	    updateDraftCell: ({ tableKey, draftRowId, columnKey, value, extraValues }) => {
	      set((state: DraftRowsSlice) => {
	        const tableState = state.draftRowsByTable[tableKey];
	        if (!tableState) return state;

	        const existingRow = tableState.map[draftRowId];
	        if (!existingRow) return state;

	        let hasValueChanges = !deepEqual(existingRow.values[columnKey], value);
	        if (!hasValueChanges && extraValues) {
	          for (const [key, extraValue] of Object.entries(extraValues)) {
	            if (!deepEqual(existingRow.values[key], extraValue)) {
	              hasValueChanges = true;
	              break;
	            }
	          }
	        }

	        const shouldResetErrors = existingRow.status === 'error' || existingRow.errors !== null;
	        if (!hasValueChanges && !shouldResetErrors) return state;

	        const updatedValues = hasValueChanges ? { ...existingRow.values, [columnKey]: deepClone(value) } : existingRow.values;
	        if (hasValueChanges && extraValues) {
	          for (const [key, extraValue] of Object.entries(extraValues)) {
	            updatedValues[key] = deepClone(extraValue);
	          }
	        }

	        const nextMap = {
	          ...tableState.map,
          [draftRowId]: {
            ...existingRow,
            values: updatedValues,
            status: existingRow.status === 'error' ? ('idle' as const) : existingRow.status,
            errors: null,
          },
        };

        return {
          draftRowsByTable: {
            ...state.draftRowsByTable,
            [tableKey]: {
              ...tableState,
              map: nextMap,
            },
          },
        };
      });
    },

    removeDraftRow: (tableKey, draftRowId) => {
      set((state: DraftRowsSlice) => {
        const tableState = state.draftRowsByTable[tableKey];
        if (!tableState) return state;
        if (!tableState.map[draftRowId]) return state;

        const nextOrder = tableState.order.filter((id) => id !== draftRowId);
        const nextMap = { ...tableState.map };
        delete nextMap[draftRowId];

        const nextTableState: DraftRowsTableState | undefined = nextOrder.length
          ? { ...tableState, order: nextOrder, map: nextMap }
          : undefined;

        const nextByTable = { ...state.draftRowsByTable };
        if (nextTableState) {
          nextByTable[tableKey] = nextTableState;
        } else {
          delete nextByTable[tableKey];
        }

        return { draftRowsByTable: nextByTable };
      });
    },

    clearDraftRowsForTable: (tableKey) => {
      set((state: DraftRowsSlice) => {
        if (!state.draftRowsByTable[tableKey]) return state;
        const nextByTable = { ...state.draftRowsByTable };
        delete nextByTable[tableKey];
        return { draftRowsByTable: nextByTable };
      });
    },

    clearDraftRowsForDatabase: (databaseId) => {
      set((state: DraftRowsSlice) => {
        if (!databaseId || !Object.keys(state.draftRowsByTable).length) return state;
        let changed = false;
        const nextByTable: Record<string, DraftRowsTableState | undefined> = { ...state.draftRowsByTable };

        for (const tableKey of Object.keys(nextByTable)) {
          const parsed = parseDraftTableKey(tableKey);
          const matchesDatabase = parsed ? parsed.databaseId === databaseId : tableKey.includes(`${databaseId}::`);

          if (matchesDatabase) {
            delete nextByTable[tableKey];
            changed = true;
          }
        }

        return changed ? { draftRowsByTable: nextByTable } : state;
      });
    },

    clearAllDraftRows: () => {
      set((state: DraftRowsSlice) => {
        if (!Object.keys(state.draftRowsByTable).length) return state;
        return { draftRowsByTable: {} };
      });
    },

	    syncDraftRowsWithMeta: (args) => {
	      const { tableKey, columnOrder, fieldMetaByKey, relationInfoByKey, metaVersion } = args;

	      set((state: DraftRowsSlice) => {
	        const tableState = state.draftRowsByTable[tableKey];
	        const effectiveColumnOrder = ensureColumnOrder(columnOrder, fieldMetaByKey, relationInfoByKey);
	        const template = buildTemplate(effectiveColumnOrder, relationInfoByKey);

	        if (!tableState) {
	          return state;
	        }

	        if (tableState.order.length === 0) {
	          const nextByTable = { ...state.draftRowsByTable };
	          delete nextByTable[tableKey];
	          return { draftRowsByTable: nextByTable };
	        }

	        const isSameMeta =
	          tableState.metaVersion === metaVersion && shallowEqualArrays(tableState.columnOrder, effectiveColumnOrder);

        if (isSameMeta) return state;

        const nextMap: Record<string, DraftRow> = {};
        for (const draftId of tableState.order) {
          const row = tableState.map[draftId];
          if (!row) continue;

          const mergedValues: Record<string, unknown> = initializeValuesFromTemplate(template, draftId);
          for (const key of Object.keys(row.values)) {
            if (Object.prototype.hasOwnProperty.call(template, key)) {
              mergedValues[key] = deepClone(row.values[key]);
            }
          }

          nextMap[draftId] = {
            ...row,
            values: mergedValues,
            metaVersion,
            status: row.status === 'error' ? 'idle' as const : row.status,
            errors: row.status === 'error' ? null : row.errors,
          };
        }

        return {
          draftRowsByTable: {
            ...state.draftRowsByTable,
            [tableKey]: {
              order: [...tableState.order],
              map: nextMap,
              template,
              metaVersion,
              columnOrder: [...effectiveColumnOrder],
            },
          },
        };
      });
    },

	    setDraftRowStatus: ({ tableKey, draftRowId, status, errors }) => {
	      set((state: DraftRowsSlice) => {
	        const tableState = state.draftRowsByTable[tableKey];
	        if (!tableState) return state;
	        const row = tableState.map[draftRowId];
	        if (!row) return state;
	        const nextErrors = errors ?? null;
	        if (row.status === status && shallowEqualRecords(row.errors, nextErrors)) return state;

	        const nextMap = {
	          ...tableState.map,
	          [draftRowId]: { ...row, status, errors: nextErrors },
	        };

        return {
          draftRowsByTable: {
            ...state.draftRowsByTable,
            [tableKey]: { ...tableState, map: nextMap },
          },
        };
      });
    },
  };
}

function ensureColumnOrder(
  columnOrder: readonly string[],
  fieldMetaByKey: Record<string, DraftFieldMetadata | undefined>,
  relationInfoByKey?: Record<string, RelationInfo | undefined>,
): string[] {
  if (columnOrder.length > 0) return [...columnOrder];

  const keys = new Set<string>();
  Object.keys(fieldMetaByKey).forEach((key) => {
    if (key) keys.add(key);
  });
  if (relationInfoByKey) {
    Object.keys(relationInfoByKey).forEach((key) => {
      if (key) keys.add(key);
    });
  }
  return Array.from(keys).sort((a, b) => a.localeCompare(b));
}

function buildTemplate(
  columnOrder: readonly string[],
  relationInfoByKey?: Record<string, RelationInfo | undefined>,
): Record<string, unknown> {
  const template: Record<string, unknown> = {};

  for (const column of columnOrder) {
    if (!column) continue;
    const relationInfo = relationInfoByKey?.[column];

    if (relationInfo && (relationInfo.kind === 'hasMany' || relationInfo.kind === 'manyToMany')) {
      template[column] = [];
    } else {
      template[column] = null;
    }
  }

  return template;
}

function generateDraftSuffix(): string {
  const cryptoObj = typeof globalThis !== 'undefined' ? (globalThis as any).crypto : undefined;
  if (cryptoObj && typeof cryptoObj.getRandomValues === 'function') {
    const buffer = new Uint32Array(1);
    cryptoObj.getRandomValues(buffer);
    return buffer[0].toString(36).slice(0, 8);
  }
  return Math.random().toString(36).slice(2, 10);
}

function initializeValuesFromTemplate(template: Record<string, unknown>, draftRowId: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(template)) {
    result[key] = deepClone(value);
  }
  if (!result.id) result.id = draftRowId;
  return result;
}

function deepClone<T>(value: T): T {
  if (Array.isArray(value)) return value.map((item) => deepClone(item)) as unknown as T;
  if (value instanceof Date) return new Date(value.getTime()) as unknown as T;
  if (value && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      result[key] = deepClone(val);
    }
    return result as unknown as T;
  }
	return value;
}

function deepEqual(a: unknown, b: unknown): boolean {
	if (Object.is(a, b)) return true;
	if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime();
	if (Array.isArray(a) && Array.isArray(b)) {
		if (a.length !== b.length) return false;
		for (let i = 0; i < a.length; i += 1) {
			if (!deepEqual(a[i], b[i])) return false;
		}
		return true;
	}
	if (a && b && typeof a === 'object' && typeof b === 'object') {
		const keysA = Object.keys(a as Record<string, unknown>);
		const keysB = Object.keys(b as Record<string, unknown>);
		if (keysA.length !== keysB.length) return false;
		for (const key of keysA) {
			if (!(key in (b as Record<string, unknown>))) return false;
			if (!deepEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key])) return false;
		}
		return true;
	}
	return false;
}

function shallowEqualRecords(
	a: Record<string, string> | null,
	b: Record<string, string> | null,
): boolean {
	if (a === b) return true;
	if (!a || !b) return false;
	const keysA = Object.keys(a);
	const keysB = Object.keys(b);
	if (keysA.length !== keysB.length) return false;
	for (const key of keysA) {
		if (a[key] !== b[key]) return false;
	}
	return true;
}

function shallowEqualArrays(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

export function computeDraftMetaSignature(
  columnOrder: readonly string[],
  fieldMetaByKey: Record<string, DraftFieldMetadata | undefined>,
  relationInfoByKey?: Record<string, RelationInfo | undefined>,
): string {
  const signatureParts = columnOrder.map((column) => {
    const typeMeta = fieldMetaByKey[column]?.type;
    const relationMeta = relationInfoByKey?.[column];

    const typePart = typeMeta
      ? [
          typeMeta.gqlType ?? '',
          typeMeta.isArray ? '1' : '0',
          typeMeta.pgAlias ?? '',
          typeMeta.pgType ?? '',
          typeMeta.subtype ?? '',
        ].join(':')
      : '';

    const relationPart = relationMeta
      ? [relationMeta.kind ?? '', relationMeta.foreignKeyField ?? '', relationMeta.relationField ?? ''].join(':')
      : '';

    return `${column}|${typePart}|${relationPart}`;
  });

  return hashString(signatureParts.join('||'));
}

function hashString(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return hash.toString(16);
}
