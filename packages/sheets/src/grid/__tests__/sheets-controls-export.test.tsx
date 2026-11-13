/* @vitest-environment jsdom */
//
// Toolbar "Export selected rows": the whole view exports through the data lane's
// "Export view" tool; this button downloads only the selected rows, so it shows
// only while rows are selected and calls `onExport` on click.
//
// Same component-test idiom as the rest of the package: jsdom + react-dom/client createRoot +
// act (no @testing-library — not a dep of this package). Buttons are located by their stable
// aria-label rather than text.
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { RangeSet } from "../../selection/range-set";
import { SheetsControls, type SheetsControlsProps } from "../sheets.controls";
import type { SheetsViewBindings } from "../view-state/use-sheets-view";
import { createSheetsViewState } from "../view-state/view-state";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// A table whose model has not loaded: the view controls render, but offer nothing yet.
function idleView(): SheetsViewBindings {
  return {
    state: createSheetsViewState(),
    model: null,
    dropped: [],
    conditions: new Map(),
    appliedCount: 0,
    searchPlan: null,
    columnLabel: (name) => name,
    relatedModel: () => null,
    setFilters: () => {},
    clearFilters: () => {},
    setSort: () => {},
    toggleSort: () => {},
    setSearch: () => {},
    setColumns: () => {},
    applyState: () => {},
    filterBy: () => false,
    layout: {
      layout: { order: [], hidden: [], frozenCount: 1, widths: {}, rowHeight: "medium" },
      orderedKeys: [],
      visibleKeys: [],
      frozenCount: 0,
      rowHeightPx: 44,
      isHidden: () => false,
      hideReason: () => null,
      setHidden: () => {},
      showAll: () => {},
      hideAll: () => {},
      moveTo: () => {},
      moveBeside: () => {},
      moveStep: () => false,
      freezeUpTo: () => {},
      unfreeze: () => {},
      setWidth: () => {},
      setRowHeight: () => {},
      fieldsOpen: false,
      setFieldsOpen: () => {},
      menuColumn: null,
      setMenuColumn: () => {},
    },
    unsortableReason: () => null,
    filtersOpen: false,
    setFiltersOpen: () => {},
    sortOpen: false,
    setSortOpen: () => {},
    searchInputRef: { current: null },
    focusSearch: () => false,
  };
}

function baseProps(overrides: Partial<SheetsControlsProps> = {}): SheetsControlsProps {
  return {
    view: idleView(),
    columnKeys: ["name"],
    showSelection: false,
    gridSelection: null,
    setGridSelection: () => {},
    deleteSelected: () => {},
    ...overrides,
  };
}

describe("SheetsControls Export selected rows", () => {
  let root: Root;
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  const twoRowsSelected = { rows: RangeSet.fromSingleSelection([0, 2]), columns: RangeSet.empty() };

  it("offers Export selected rows while rows are selected and calls onExport on click", async () => {
    const onExport = vi.fn();
    await act(async () => {
      root.render(<SheetsControls {...baseProps({ onExport, gridSelection: twoRowsSelected })} />);
    });

    const btn = container.querySelector<HTMLButtonElement>('button[aria-label="Export selected rows"]');
    expect(btn?.textContent).toContain("Export selected (2)");

    await act(async () => {
      btn!.click();
    });
    expect(onExport).toHaveBeenCalledTimes(1);
  });

  it("does not offer it without a selection or without onExport", async () => {
    await act(async () => {
      root.render(<SheetsControls {...baseProps({ onExport: vi.fn() })} />);
    });
    expect(container.querySelector('button[aria-label="Export selected rows"]')).toBeNull();

    await act(async () => {
      root.render(<SheetsControls {...baseProps({ gridSelection: twoRowsSelected })} />);
    });
    expect(container.querySelector('button[aria-label="Export selected rows"]')).toBeNull();
  });
});
