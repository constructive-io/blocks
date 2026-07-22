import { memo, useCallback, useEffect, useMemo, useState } from "react";
import {
  RiAddLine,
  RiCloseCircleLine,
  RiDeleteBin6Line,
  RiDownloadLine,
  RiFilter3Line,
  RiSearch2Line,
} from "@remixicon/react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@constructive-io/ui/alert-dialog";
import { Button } from "@constructive-io/ui/button";
import { Input } from "@constructive-io/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@constructive-io/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@constructive-io/ui/select";

import {
  getDefaultOperator,
  getOperatorsForGqlType,
  isFilterableType,
  type FilterOperator,
  type OperatorValueType,
} from "./filter-operators";
import type { SheetsSelection } from "../selection/selection-model";

// Filter value can be string, number, boolean, null, or undefined
// This matches the usage in buildWhereFromFilters and GraphQL filter operations
export type FilterValue = string | number | boolean | null | undefined;

// ── Filter tree types ──

export type FilterNode = FilterCondition | FilterGroup;

export interface FilterCondition {
  type: "condition";
  id: string;
  field: string;
  operator: string;
  value: FilterValue;
}

export interface FilterGroup {
  type: "group";
  id: string;
  conjunction: "and" | "or";
  children: FilterNode[];
}

export const MAX_FILTER_DEPTH = 3;

export type FieldTypeMap = Record<string, { gqlType: string; isArray: boolean }>;

// ── Tree helpers ──

function uid(): string {
  return Math.random().toString(36).slice(2, 9);
}

export function createEmptyGroup(conjunction: "and" | "or" = "and"): FilterGroup {
  return { type: "group", id: uid(), conjunction, children: [] };
}

function createCondition(field: string, operator: string): FilterCondition {
  return { type: "condition", id: uid(), field, operator, value: "" };
}

export function countConditions(node: FilterNode): number {
  if (node.type === "condition") return 1;
  return node.children.reduce((sum, child) => sum + countConditions(child), 0);
}

export interface SheetsControlsProps {
  openSearch?: () => void;
  filterTree: FilterGroup;
  setFilterTree: (tree: FilterGroup) => void;
  filtersOpen: boolean;
  setFiltersOpen: (open: boolean) => void;
  clearAllFilters: () => void;
  applyFilters: () => void;
  columnKeys: string[];
  fieldTypeMap: FieldTypeMap;
  showSelection: boolean;
  gridSelection: SheetsSelection | null;
  setGridSelection: (selection: SheetsSelection | null) => void;
  deleteSelected: () => void;
  onAddRow?: () => void;
  onExport?: () => void;
}

function getInputType(valueType: OperatorValueType): string {
  switch (valueType) {
    case "number":
      return "number";
    case "date":
      return "date";
    case "datetime":
      return "datetime-local";
    default:
      return "text";
  }
}

function getPlaceholder(valueType: OperatorValueType): string {
  if (valueType === "key") return "key name";
  return "Value...";
}

/** Parse a JSON-encoded IntervalInput string into individual fields. */
function parseIntervalValue(raw: FilterValue): {
  days: string;
  hours: string;
  minutes: string;
  seconds: string;
} {
  const empty = { days: "", hours: "", minutes: "", seconds: "" };
  if (!raw || typeof raw !== "string") return empty;
  try {
    const obj = JSON.parse(raw);
    return {
      days: obj.days ? String(obj.days) : "",
      hours: obj.hours ? String(obj.hours) : "",
      minutes: obj.minutes ? String(obj.minutes) : "",
      seconds: obj.seconds ? String(obj.seconds) : "",
    };
  } catch {
    return empty;
  }
}

/** Compose individual interval fields into a JSON-encoded IntervalInput string. */
function composeIntervalValue(fields: {
  days: string;
  hours: string;
  minutes: string;
  seconds: string;
}): string {
  const obj: Record<string, number> = {};
  const d = parseInt(fields.days, 10);
  const h = parseInt(fields.hours, 10);
  const m = parseInt(fields.minutes, 10);
  const s = parseInt(fields.seconds, 10);
  if (!isNaN(d) && d !== 0) obj.days = d;
  if (!isNaN(h) && h !== 0) obj.hours = h;
  if (!isNaN(m) && m !== 0) obj.minutes = m;
  if (!isNaN(s) && s !== 0) obj.seconds = s;
  return Object.keys(obj).length > 0 ? JSON.stringify(obj) : "";
}

/** Structured interval input — renders d/h/m/s number fields that map to IntervalInput. */
function IntervalFilterInput({
  value,
  onChange,
}: {
  value: FilterValue;
  onChange: (v: string) => void;
}) {
  const fields = useMemo(() => parseIntervalValue(value), [value]);

  const handleChange = useCallback(
    (unit: "days" | "hours" | "minutes" | "seconds", v: string) => {
      onChange(composeIntervalValue({ ...fields, [unit]: v }));
    },
    [fields, onChange],
  );

  return (
    <div className="flex items-center gap-1">
      <Input
        className="w-[52px] px-1.5 text-center"
        type="number"
        placeholder="d"
        min={0}
        value={fields.days}
        onChange={(e) => handleChange("days", e.target.value)}
      />
      <Input
        className="w-[52px] px-1.5 text-center"
        type="number"
        placeholder="h"
        min={0}
        max={23}
        value={fields.hours}
        onChange={(e) => handleChange("hours", e.target.value)}
      />
      <Input
        className="w-[52px] px-1.5 text-center"
        type="number"
        placeholder="m"
        min={0}
        max={59}
        value={fields.minutes}
        onChange={(e) => handleChange("minutes", e.target.value)}
      />
      <Input
        className="w-[52px] px-1.5 text-center"
        type="number"
        placeholder="s"
        min={0}
        max={59}
        value={fields.seconds}
        onChange={(e) => handleChange("seconds", e.target.value)}
      />
    </div>
  );
}

const FilterConditionRow = memo(function FilterConditionRow({
  condition,
  columns,
  fieldTypeMap,
  onChange,
  onRemove,
}: {
  condition: FilterCondition;
  columns: readonly string[];
  fieldTypeMap: FieldTypeMap;
  onChange: (updates: Partial<FilterCondition>) => void;
  onRemove: () => void;
}) {
  const typeInfo = fieldTypeMap[condition.field];
  const operators = useMemo<FilterOperator[]>(
    () => getOperatorsForGqlType(typeInfo?.gqlType, typeInfo?.isArray ?? false),
    [typeInfo?.gqlType, typeInfo?.isArray],
  );
  const currentOp = operators.find((o) => o.operator === condition.operator) ?? operators[0];

  const handleColumnChange = useCallback(
    (newField: string) => {
      const info = fieldTypeMap[newField];
      const defaultOp = getDefaultOperator(info?.gqlType, info?.isArray ?? false) ?? "equalTo";
      onChange({ field: newField, operator: defaultOp, value: "" });
    },
    [fieldTypeMap, onChange],
  );

  const handleOperatorChange = useCallback(
    (newOp: string) => {
      const opEntry = operators.find((o) => o.operator === newOp);
      if (opEntry?.valueType === "none") {
        onChange({ operator: newOp, value: "" });
      } else {
        onChange({ operator: newOp });
      }
    },
    [operators, onChange],
  );

  return (
    <div className="flex items-center gap-2">
      <Select value={condition.field} onValueChange={handleColumnChange}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Column" />
        </SelectTrigger>
        <SelectContent>
          {columns.map((k) => (
            <SelectItem key={k} value={k}>
              {k}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {operators.length > 0 && (
        <Select value={currentOp?.operator ?? ""} onValueChange={handleOperatorChange}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Operator" />
          </SelectTrigger>
          <SelectContent>
            {operators.map((op) => (
              <SelectItem key={op.operator} value={op.operator}>
                {op.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {currentOp && currentOp.valueType === "interval" && (
        <IntervalFilterInput value={condition.value} onChange={(v) => onChange({ value: v })} />
      )}

      {currentOp && currentOp.valueType !== "none" && currentOp.valueType !== "interval" && (
        <Input
          className="w-[150px]"
          type={getInputType(currentOp.valueType)}
          placeholder={getPlaceholder(currentOp.valueType)}
          value={
            typeof condition.value === "string" || typeof condition.value === "number"
              ? String(condition.value)
              : ""
          }
          onChange={(e) => onChange({ value: e.target.value })}
        />
      )}

      <Button variant="ghost" size="icon" onClick={onRemove} aria-label="Remove filter">
        <RiCloseCircleLine className="h-4 w-4" />
      </Button>
    </div>
  );
});

/** Recursive filter group UI — renders AND/OR toggle + conditions + nested groups. */
const FilterGroupUI = memo(function FilterGroupUI({
  group,
  depth,
  fieldTypeMap,
  filterableColumns,
  onChange,
  onRemove,
}: {
  group: FilterGroup;
  depth: number;
  fieldTypeMap: FieldTypeMap;
  filterableColumns: readonly string[];
  onChange: (updated: FilterGroup) => void;
  onRemove?: () => void;
}) {
  const toggleConjunction = useCallback(() => {
    onChange({ ...group, conjunction: group.conjunction === "and" ? "or" : "and" });
  }, [group, onChange]);

  const addCondition = useCallback(() => {
    const firstCol = filterableColumns[0];
    if (!firstCol) return;
    const info = fieldTypeMap[firstCol];
    const defaultOp = getDefaultOperator(info?.gqlType, info?.isArray ?? false) ?? "equalTo";
    onChange({ ...group, children: [...group.children, createCondition(firstCol, defaultOp)] });
  }, [group, filterableColumns, fieldTypeMap, onChange]);

  const addGroup = useCallback(() => {
    const childConj = group.conjunction === "and" ? "or" : "and";
    onChange({ ...group, children: [...group.children, createEmptyGroup(childConj)] });
  }, [group, onChange]);

  const updateChild = useCallback(
    (childId: string, updated: FilterNode) => {
      onChange({ ...group, children: group.children.map((c) => (c.id === childId ? updated : c)) });
    },
    [group, onChange],
  );

  const removeChild = useCallback(
    (childId: string) => {
      onChange({ ...group, children: group.children.filter((c) => c.id !== childId) });
    },
    [group, onChange],
  );

  return (
    <div className={depth > 0 ? "border-muted-foreground/20 ml-1 border-l-2 pl-3" : undefined}>
      <div className="mb-2 flex items-center gap-1.5">
        <span className="text-muted-foreground text-xs">Match</span>
        <Button
          variant="outline"
          size="sm"
          className="h-6 px-2 text-xs font-medium"
          onClick={toggleConjunction}
        >
          {group.conjunction === "and" ? "all" : "any"}
        </Button>
        <span className="text-muted-foreground text-xs">of:</span>
        {onRemove && (
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto h-6 w-6"
            onClick={onRemove}
            aria-label="Remove group"
          >
            <RiCloseCircleLine className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      <div className="grid gap-2">
        {group.children.map((child) => {
          if (child.type === "condition") {
            return (
              <FilterConditionRow
                key={child.id}
                condition={child}
                columns={filterableColumns}
                fieldTypeMap={fieldTypeMap}
                onChange={(updates) => updateChild(child.id, { ...child, ...updates })}
                onRemove={() => removeChild(child.id)}
              />
            );
          }
          return (
            <FilterGroupUI
              key={child.id}
              group={child}
              depth={depth + 1}
              fieldTypeMap={fieldTypeMap}
              filterableColumns={filterableColumns}
              onChange={(updated) => updateChild(child.id, updated)}
              onRemove={() => removeChild(child.id)}
            />
          );
        })}
      </div>

      <div className="mt-2 flex items-center gap-2">
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={addCondition}>
          <RiAddLine className="mr-1 h-3.5 w-3.5" /> Condition
        </Button>
        {depth < MAX_FILTER_DEPTH - 1 && (
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={addGroup}>
            <RiAddLine className="mr-1 h-3.5 w-3.5" /> Group
          </Button>
        )}
      </div>
    </div>
  );
});

export function SheetsControls(props: SheetsControlsProps) {
  const {
    openSearch,
    filterTree,
    setFilterTree,
    filtersOpen,
    setFiltersOpen,
    clearAllFilters,
    applyFilters,
    columnKeys,
    fieldTypeMap,
    showSelection,
    gridSelection,
    deleteSelected,
    onAddRow,
    onExport,
  } = props;

  const filterableColumns = useMemo(() => {
    if (Object.keys(fieldTypeMap).length === 0) return columnKeys;
    return columnKeys.filter((k) => {
      const info = fieldTypeMap[k];
      if (!info) return false;
      return isFilterableType(info.gqlType, info.isArray);
    });
  }, [columnKeys, fieldTypeMap]);

  // ── Local filter tree (only committed on Apply) ──
  const [localTree, setLocalTree] = useState<FilterGroup>(filterTree);

  // Sync local state when popover opens
  useEffect(() => {
    if (filtersOpen) {
      setLocalTree(filterTree);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only trigger on popover open/close
  }, [filtersOpen]);

  const handleApplyFilters = useCallback(() => {
    setFilterTree(localTree);
    applyFilters();
  }, [localTree, setFilterTree, applyFilters]);

  const handleClearAllFilters = useCallback(() => {
    setLocalTree(createEmptyGroup());
    clearAllFilters();
  }, [clearAllFilters]);

  const conditionCount = useMemo(() => countConditions(localTree), [localTree]);

  const selectedRowCount = useMemo(() => {
    if (!gridSelection) return 0;
    return gridSelection.rows.length;
  }, [gridSelection]);

  return (
    <>
      <div
        data-part-id="sheets-controls"
        className="flex shrink-0 flex-wrap items-center justify-between gap-4 py-4"
      >
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => openSearch?.()}>
            <RiSearch2Line className="text-muted-foreground/60 -ms-1.5 size-5" aria-hidden="true" />
            Search
          </Button>
          {onAddRow && (
            <Button variant="outline" size="sm" aria-label="Add row" onClick={() => onAddRow()}>
              <RiAddLine className="text-muted-foreground/60 -ms-1.5 size-5" aria-hidden="true" />
              Add row
            </Button>
          )}
          {onExport && (
            <Button variant="outline" size="sm" aria-label="Export CSV" onClick={() => onExport()}>
              <RiDownloadLine
                className="text-muted-foreground/60 -ms-1.5 size-5"
                aria-hidden="true"
              />
              Export
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {showSelection && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive-outline" size="sm" disabled={selectedRowCount === 0}>
                  <RiDeleteBin6Line className="-ms-1.5 size-5" aria-hidden="true" />
                  Delete
                  {selectedRowCount > 0 ? ` (${selectedRowCount})` : ""}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete rows?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete {selectedRowCount}{" "}
                    {selectedRowCount === 1 ? "row" : "rows"}. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-white hover:bg-destructive/90"
                    onClick={() => deleteSelected()}
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          <Popover open={filtersOpen} onOpenChange={setFiltersOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="relative">
                <RiFilter3Line
                  className="text-muted-foreground/60 -ms-1.5 size-5"
                  aria-hidden="true"
                />
                Filters
                {countConditions(filterTree) > 0 && (
                  <span
                    className="border-border/60 bg-background text-muted-foreground/70 ms-2 -me-1 inline-flex h-5
											max-h-full items-center rounded border px-1 font-[inherit] text-[0.625rem] font-medium"
                  >
                    {countConditions(filterTree)}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-auto min-w-[28rem] max-h-[32rem] overflow-auto p-4"
              align="end"
            >
              <div className="grid gap-4">
                <div className="space-y-2">
                  <h4 className="leading-none font-medium">Filters</h4>
                </div>
                <FilterGroupUI
                  group={localTree}
                  depth={0}
                  fieldTypeMap={fieldTypeMap}
                  filterableColumns={filterableColumns}
                  onChange={setLocalTree}
                />
                <div className="flex items-center justify-end gap-2 border-t pt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearAllFilters}
                    disabled={conditionCount === 0}
                  >
                    Clear all
                  </Button>
                  <Button size="sm" onClick={handleApplyFilters}>
                    Apply
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </>
  );
}
