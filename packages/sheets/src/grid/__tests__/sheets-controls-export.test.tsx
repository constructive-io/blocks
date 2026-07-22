/* @vitest-environment jsdom */
//
// Toolbar Export button (STAGE A). The CSV export path lived only behind the imperative
// SheetsHandle.exportCsv(); this proves the visible toolbar control: <SheetsControls> renders
// an "Export CSV" button when `onExport` is set and invokes it on click, and renders NOTHING
// when the prop is omitted (no behaviour change for hosts that don't wire it).
//
// Same component-test idiom as the rest of the package: jsdom + react-dom/client createRoot +
// act (no @testing-library — not a dep of this package). Buttons are located by their stable
// aria-label rather than text.
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SheetsControls, createEmptyGroup, type SheetsControlsProps } from "../sheets.controls";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function baseProps(overrides: Partial<SheetsControlsProps> = {}): SheetsControlsProps {
  return {
    filterTree: createEmptyGroup(),
    setFilterTree: () => {},
    filtersOpen: false,
    setFiltersOpen: () => {},
    clearAllFilters: () => {},
    applyFilters: () => {},
    columnKeys: ["name"],
    fieldTypeMap: {},
    showSelection: false,
    gridSelection: null,
    setGridSelection: () => {},
    deleteSelected: () => {},
    ...overrides,
  };
}

describe("SheetsControls Export button", () => {
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

  it("renders the Export button and calls onExport on click when onExport is set", async () => {
    const onExport = vi.fn();
    await act(async () => {
      root.render(<SheetsControls {...baseProps({ onExport })} />);
    });

    const btn = container.querySelector<HTMLButtonElement>('button[aria-label="Export CSV"]');
    expect(btn).not.toBeNull();

    await act(async () => {
      btn!.click();
    });
    expect(onExport).toHaveBeenCalledTimes(1);
  });

  it("does not render the Export button when onExport is omitted", async () => {
    await act(async () => {
      root.render(<SheetsControls {...baseProps()} />);
    });

    expect(container.querySelector('button[aria-label="Export CSV"]')).toBeNull();
  });
});
