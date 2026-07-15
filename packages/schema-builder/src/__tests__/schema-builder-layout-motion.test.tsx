import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MotionConfig } from 'motion/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

const schemaMocks = vi.hoisted(() => ({
  currentSchema: null as Record<string, unknown> | null,
  currentTable: null as Record<string, unknown> | null,
  draggedType: {
    configurable: {},
    defaultConstraints: { nullable: true },
    description: 'Plain text',
    label: 'Text',
    type: 'text'
  },
  panelExpanded: true,
  pushCard: vi.fn(),
  sections: { app: true, system: false },
  selectTable: vi.fn(),
  selectedTableId: 'app-table',
  togglePanel: vi.fn(),
  toggleSidebarSection: vi.fn()
}));

vi.mock('motion/react', async () => {
  const React = await vi.importActual<typeof import('react')>('react');
  const ReducedMotionContext = React.createContext('never');

  type MotionDivProps = React.HTMLAttributes<HTMLDivElement> & {
    animate?: Record<string, unknown>;
    exit?: Record<string, unknown>;
    initial?: false | Record<string, unknown>;
    transition?: Record<string, unknown>;
  };

  const MotionDiv = React.forwardRef<HTMLDivElement, MotionDivProps>(
    ({ animate, exit, initial, style, transition, ...props }, ref) => {
      const reducedMotion = React.useContext(ReducedMotionContext);

      return React.createElement('div', {
        ...props,
        ref,
        style,
        'data-motion-animate': JSON.stringify(animate),
        'data-motion-exit': JSON.stringify(exit),
        'data-motion-initial': JSON.stringify(initial),
        'data-motion-reduced-motion': reducedMotion,
        'data-motion-style': JSON.stringify(style),
        'data-motion-transition': JSON.stringify(transition)
      });
    }
  );

  return {
    AnimatePresence: ({ children }: { children: ReactNode }) => children,
    MotionConfig: ({ children, reducedMotion = 'never' }: { children: ReactNode; reducedMotion?: string }) =>
      React.createElement(ReducedMotionContext.Provider, { value: reducedMotion }, children),
    motion: { div: MotionDiv }
  };
});

vi.mock('@constructive-io/ui/button', async () => {
  const React = await vi.importActual<typeof import('react')>('react');

  return {
    Button: React.forwardRef<
      HTMLButtonElement,
      React.ButtonHTMLAttributes<HTMLButtonElement> & { size?: string; variant?: string }
    >(({ children, size: _size, variant: _variant, ...props }, ref) => (
      <button ref={ref} type='button' {...props}>
        {children}
      </button>
    ))
  };
});

vi.mock('@constructive-io/ui/tooltip', async () => {
  const React = await vi.importActual<typeof import('react')>('react');

  return {
    Tooltip: ({ children }: { children: ReactNode }) => children,
    TooltipContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    TooltipProvider: ({ children }: { children: ReactNode }) => children,
    TooltipTrigger: ({ children }: { children: ReactNode }) =>
      React.isValidElement(children) ? children : <>{children}</>
  };
});

vi.mock('@constructive-io/ui/dropdown-menu', async () => {
  const React = await vi.importActual<typeof import('react')>('react');

  return {
    DropdownMenu: ({ children }: { children: ReactNode }) => children,
    DropdownMenuContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    DropdownMenuItem: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
      <button type='button' {...props}>
        {children}
      </button>
    ),
    DropdownMenuTrigger: ({ children }: { children: ReactNode }) =>
      React.isValidElement(children) ? children : <>{children}</>
  };
});

vi.mock('@constructive-io/ui/progressive-blur', () => ({
  ProgressiveBlur: ({ position }: { position: string }) => <div data-testid={`progressive-blur-${position}`} />
}));

vi.mock('@constructive-io/ui/stack', () => ({
  useCardStack: () => ({ push: schemaMocks.pushCard })
}));

vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: { children: ReactNode }) => <div data-testid='dnd-context'>{children}</div>,
  DragOverlay: ({ children }: { children: ReactNode }) => <div data-testid='drag-overlay'>{children}</div>,
  useDraggable: ({ id }: { id: string }) => ({
    attributes: { 'aria-describedby': `${id}-instructions`, role: 'button', tabIndex: 0 },
    isDragging: false,
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null
  })
}));

vi.mock('@/blocks/schema/schema-builder-core/lib/gql/hooks/schema-builder', () => ({
  useSchemaBuilderSelectors: () => ({
    currentSchema: schemaMocks.currentSchema,
    currentTable: schemaMocks.currentTable,
    selectTable: schemaMocks.selectTable,
    selectedTableId: schemaMocks.selectedTableId
  })
}));

vi.mock('@/blocks/schema/schema-builder-core/store/app-store', () => ({
  useSidebarSectionActions: () => ({ toggleSidebarSection: schemaMocks.toggleSidebarSection }),
  useSidebarSections: () => schemaMocks.sections,
  useToggleTypesLibraryExpanded: () => schemaMocks.togglePanel,
  useTypesLibraryExpanded: () => schemaMocks.panelExpanded
}));

vi.mock('../schema/schema-builder-fields/components/table-editor/use-field-dnd', () => ({
  DEFAULT_DROP_ANIMATION: {},
  useFieldDnD: () => ({
    activeId: 'field-type-text',
    customCollisionDetection: vi.fn(),
    dragSource: 'panel',
    draggedType: schemaMocks.draggedType,
    handleAddFieldRef: vi.fn(),
    handleDragCancel: vi.fn(),
    handleDragEnd: vi.fn(),
    handleDragStart: vi.fn(),
    sensors: []
  })
}));

vi.mock('../schema/schema-builder-fields/components/table-editor/fields-section', () => ({
  FieldsSection: () => <div data-testid='fields-section'>Field editor dropzone</div>
}));

vi.mock('@/blocks/schema/schema-builder-tables/components/table-editor/table-metadata-section', () => ({
  TableMetadataSection: () => <div>Field metadata</div>
}));

vi.mock('@/blocks/schema/schema-builder-tables/components/table-editor/no-table-selected-view', () => ({
  NoTableSelectedView: () => <div>No table selected</div>
}));

vi.mock('../schema/schema-builder-tables/components/tables', () => ({
  CreateTableCard: () => null,
  DeleteTableDialog: () => null
}));

import { TableEditor } from '../schema/schema-builder-fields/components/table-editor/table-editor';
import { TypesLibrary } from '../schema/schema-builder-fields/components/table-editor/types-library';
import {
  SchemaBuilderSidebar,
  getScrollAffordanceState
} from '../schema/schema-builder-tables/components/schemas/schema-builder-sidebar';

const APP_TABLE = {
  category: 'APP',
  fields: [],
  id: 'app-table',
  name: 'posts'
};

const SYSTEM_TABLE = {
  category: 'CORE',
  fields: [],
  id: 'system-table',
  name: 'internal_jobs'
};

const LAYOUT_PROPERTIES = ['bottom', 'height', 'left', 'margin', 'padding', 'paddingRight', 'right', 'top', 'width'];

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

function renderWithMotion(children: ReactNode) {
  return render(<MotionConfig reducedMotion='user'>{children}</MotionConfig>);
}

function parseMotionValue(element: Element, attribute: string): unknown {
  const value = element.getAttribute(attribute);
  return value === null || value === undefined ? undefined : JSON.parse(value);
}

function activateButtonWithEnter(button: HTMLElement) {
  button.focus();
  fireEvent.keyDown(button, { code: 'Enter', key: 'Enter' });
  // jsdom does not synthesize the native button click generated by Enter.
  fireEvent.click(button, { detail: 0 });
  fireEvent.keyUp(button, { code: 'Enter', key: 'Enter' });
}

function expectTransformOnlyMotion(container: ParentNode) {
  const motionElements = [...container.querySelectorAll<HTMLElement>('[data-motion-animate]')];
  expect(motionElements.length).toBeGreaterThan(0);

  motionElements.forEach((element) => {
    ['data-motion-initial', 'data-motion-animate', 'data-motion-exit', 'data-motion-transition'].forEach(
      (attribute) => {
        const value = parseMotionValue(element, attribute);
        if (!value || typeof value !== 'object' || Array.isArray(value)) return;
        expect(Object.keys(value as Record<string, unknown>)).not.toEqual(expect.arrayContaining(LAYOUT_PROPERTIES));
      }
    );
    expect(element.getAttribute('data-motion-reduced-motion')).toBe('user');
  });
}

beforeEach(() => {
  schemaMocks.currentTable = APP_TABLE;
  schemaMocks.currentSchema = {
    id: 'schema-1',
    name: 'public',
    relationships: [],
    tables: [APP_TABLE, SYSTEM_TABLE],
    version: '1'
  };
  schemaMocks.panelExpanded = true;
  schemaMocks.sections = { app: true, system: false };
  schemaMocks.selectedTableId = APP_TABLE.id;
  schemaMocks.pushCard.mockReset();
  schemaMocks.selectTable.mockReset();
  schemaMocks.togglePanel.mockReset();
  schemaMocks.toggleSidebarSection.mockReset();

  vi.stubGlobal('ResizeObserver', ResizeObserverStub);
  vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('schema builder layout-safe motion', () => {
  it('commits table editor panel geometry while preserving crossfades, toggles, and DnD content', () => {
    const view = renderWithMotion(<TableEditor />);
    const editor = view.container.querySelector<HTMLElement>("[data-chat-component='table-editor']")!;
    const [mainContent, panel] = [...editor.children] as HTMLElement[];

    expect(mainContent.style.paddingRight).toBe('380px');
    expect(mainContent.hasAttribute('data-motion-animate')).toBe(false);
    expect(panel.style.width).toBe('380px');
    expect(panel.dataset.state).toBe('expanded');
    expect(panel.hasAttribute('data-motion-animate')).toBe(false);
    expect(screen.getByText('Field metadata')).toBeTruthy();
    expect(screen.getByTestId('fields-section').textContent).toContain('Field editor dropzone');
    expect(within(screen.getByTestId('drag-overlay')).getByText('Text')).toBeTruthy();

    const crossfadeLayers = [...panel.querySelectorAll<HTMLElement>(':scope [data-motion-animate]')].slice(0, 2);
    expect(crossfadeLayers.map((layer) => parseMotionValue(layer, 'data-motion-animate'))).toEqual([
      { opacity: 0 },
      { opacity: 1 }
    ]);
    expect(crossfadeLayers.map((layer) => layer.style.pointerEvents)).toEqual(['none', 'auto']);

    fireEvent.click(screen.getByRole('button', { name: 'Collapse panel' }));
    expect(schemaMocks.togglePanel).toHaveBeenCalledTimes(1);
    schemaMocks.panelExpanded = false;
    view.rerender(<MotionConfig reducedMotion='user'><TableEditor /></MotionConfig>);

    const collapsedEditor = view.container.querySelector<HTMLElement>("[data-chat-component='table-editor']")!;
    const [collapsedMain, collapsedPanel] = [...collapsedEditor.children] as HTMLElement[];
    expect(collapsedMain.style.paddingRight).toBe('56px');
    expect(collapsedPanel.style.width).toBe('56px');
    expect(collapsedPanel.dataset.state).toBe('collapsed');
    expect(screen.getAllByRole('button', { name: 'Expand panel' })).toHaveLength(2);
    expectTransformOnlyMotion(view.container);

    schemaMocks.currentTable = null;
    view.rerender(<MotionConfig reducedMotion='user'><TableEditor /></MotionConfig>);
    const emptyEditor = view.container.querySelector<HTMLElement>("[data-chat-component='table-editor']")!;
    expect((emptyEditor.firstElementChild as HTMLElement).style.paddingRight).toBe('0px');
    expect(emptyEditor.querySelector('[data-state]')).toBeNull();
    expect(screen.getByText('No table selected')).toBeTruthy();
  });

  it('toggles type sections through the existing button semantics without layout animation', () => {
    const view = renderWithMotion(<TypesLibrary />);
    const basicTrigger = screen.getByRole('button', { name: /Basic/ });
    const advancedTrigger = screen.getByRole('button', { name: /Advanced/ });

    expect(basicTrigger.getAttribute('aria-expanded')).toBe('true');
    expect(advancedTrigger.getAttribute('aria-expanded')).toBe('false');
    expect(screen.getByText('Text', { selector: 'span' })).toBeTruthy();
    expect(view.container.querySelectorAll('[data-motion-animate][class*="overflow-hidden"]')).toHaveLength(1);
    expect(view.container.querySelector('.overflow-auto')).toBeTruthy();

    activateButtonWithEnter(advancedTrigger);

    expect(document.activeElement).toBe(advancedTrigger);
    expect(advancedTrigger.getAttribute('aria-expanded')).toBe('true');
    expect(view.container.querySelectorAll('[data-motion-animate][class*="overflow-hidden"]')).toHaveLength(2);

    fireEvent.click(basicTrigger);
    fireEvent.click(basicTrigger);
    expect(basicTrigger.getAttribute('aria-expanded')).toBe('true');

    const contentLayers = [...view.container.querySelectorAll<HTMLElement>('[data-motion-animate][class*="overflow-hidden"]')];
    contentLayers.forEach((layer) => {
      expect(parseMotionValue(layer, 'data-motion-initial')).toEqual({ opacity: 0, y: -4 });
      expect(parseMotionValue(layer, 'data-motion-animate')).toEqual({ opacity: 1, y: 0 });
      expect(parseMotionValue(layer, 'data-motion-exit')).toEqual({ opacity: 0, y: -4 });
    });
    expectTransformOnlyMotion(view.container);
  });

  it('preserves sidebar presence, selected indicators, rapid reversal, and scroll affordances', () => {
    const view = renderWithMotion(<SchemaBuilderSidebar showSystemTables />);
    const appTrigger = screen.getByRole('button', { name: /Your Tables/ });
    const systemTrigger = screen.getByRole('button', { name: /System Tables/ });

    expect(appTrigger.getAttribute('aria-expanded')).toBe('true');
    expect(systemTrigger.getAttribute('aria-expanded')).toBe('false');
    expect(screen.getByTestId('collapsible-content-Your Tables')).toBeTruthy();
    expect(screen.queryByTestId('collapsible-content-System Tables')).toBeNull();

    activateButtonWithEnter(appTrigger);
    expect(schemaMocks.toggleSidebarSection).toHaveBeenCalledWith('app');
    expect(document.activeElement).toBe(appTrigger);

    schemaMocks.sections = { app: false, system: false };
    view.rerender(<MotionConfig reducedMotion='user'><SchemaBuilderSidebar showSystemTables /></MotionConfig>);
    expect(screen.queryByTestId('collapsible-content-Your Tables')).toBeNull();
    expect(screen.getByLabelText('Contains selected item')).toBeTruthy();

    schemaMocks.sections = { app: true, system: false };
    view.rerender(<MotionConfig reducedMotion='user'><SchemaBuilderSidebar showSystemTables /></MotionConfig>);
    schemaMocks.sections = { app: false, system: false };
    view.rerender(<MotionConfig reducedMotion='user'><SchemaBuilderSidebar showSystemTables /></MotionConfig>);
    schemaMocks.sections = { app: true, system: true };
    view.rerender(<MotionConfig reducedMotion='user'><SchemaBuilderSidebar showSystemTables /></MotionConfig>);

    expect(screen.getByTestId('collapsible-content-Your Tables')).toBeTruthy();
    expect(screen.getByTestId('collapsible-content-System Tables')).toBeTruthy();
    expect(screen.queryByLabelText('Contains selected item')).toBeNull();

    const viewport = screen
      .getByTestId('collapsible-content-Your Tables')
      .querySelector<HTMLElement>('.scrollbar-neutral-thin')!;
    Object.defineProperties(viewport, {
      clientHeight: { configurable: true, value: 100 },
      scrollHeight: { configurable: true, value: 400 },
      scrollTop: { configurable: true, value: 100, writable: true }
    });
    fireEvent.scroll(viewport);
    expect(screen.getByTestId('progressive-blur-top')).toBeTruthy();
    expect(screen.getByTestId('progressive-blur-bottom')).toBeTruthy();

    expect(getScrollAffordanceState({ clientHeight: 100, scrollHeight: 400, scrollTop: 300 })).toEqual({
      hasOverflow: true,
      showBottomBlur: false,
      showTopBlur: true
    });

    const contentLayers = [...view.container.querySelectorAll<HTMLElement>('[data-testid^="collapsible-content-"]')];
    contentLayers.forEach((layer) => {
      expect(parseMotionValue(layer, 'data-motion-initial')).toEqual({ opacity: 0, y: -4 });
      expect(parseMotionValue(layer, 'data-motion-animate')).toEqual({ opacity: 1, y: 0 });
      expect(parseMotionValue(layer, 'data-motion-exit')).toEqual({ opacity: 0, y: -4 });
    });
    expectTransformOnlyMotion(view.container);
  });
});
