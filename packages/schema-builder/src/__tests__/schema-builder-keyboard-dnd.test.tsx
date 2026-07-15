import { useEffect } from 'react';
import { DndContext, useDraggable, useDroppable } from '@dnd-kit/core';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { FieldDefinition, FieldTypeInfo, TableDefinition } from '../schema/schema-builder-core/lib/schema';
import {
  COLUMN_EDITOR_DROPZONE_ID,
  useFieldDnD
} from '../schema/schema-builder-fields/components/table-editor/use-field-dnd';

const textType: FieldTypeInfo = {
  type: 'text',
  label: 'Text',
  description: 'Plain text',
  defaultConstraints: { nullable: true },
  configurable: {}
};

const table: TableDefinition = {
  id: 'table-1',
  name: 'posts',
  fields: []
};

function rect(left: number, top: number, width: number, height: number): DOMRect {
  return {
    x: left,
    y: top,
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
    toJSON: () => ({})
  } as DOMRect;
}

function DraggableType() {
  const { attributes, listeners, setNodeRef } = useDraggable({
    id: 'field-type-text',
    data: { typeInfo: textType, source: 'panel' as const }
  });

  return (
    <button
      ref={setNodeRef}
      data-testid='draggable-field-type'
      type='button'
      {...listeners}
      {...attributes}
    >
      Text
    </button>
  );
}

function FieldDropzone() {
  const { isOver, setNodeRef } = useDroppable({ id: COLUMN_EDITOR_DROPZONE_ID });

  return (
    <div
      ref={setNodeRef}
      data-testid='field-dropzone'
      data-is-over={String(isOver)}
    />
  );
}

function KeyboardDndHarness({ onAddField }: { onAddField: (field: FieldDefinition) => void }) {
  const {
    sensors,
    customCollisionDetection,
    handleDragStart,
    handleDragEnd,
    handleDragCancel,
    handleAddFieldRef,
    activeId
  } = useFieldDnD(table);

  useEffect(() => {
    handleAddFieldRef(onAddField);
  }, [handleAddFieldRef, onAddField]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={customCollisionDetection}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <output data-testid='active-drag'>{activeId ?? ''}</output>
      <DraggableType />
      <FieldDropzone />
    </DndContext>
  );
}

beforeEach(() => {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    if (this.getAttribute('data-testid') === 'draggable-field-type') return rect(0, 0, 20, 20);
    if (this.getAttribute('data-testid') === 'field-dropzone') return rect(25, 0, 20, 20);
    return rect(0, 0, 1000, 1000);
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('schema builder keyboard field drag', () => {
  it('moves a field type onto the dropzone, inserts it, and cancels without insertion', async () => {
    const onAddField = vi.fn();
    render(<KeyboardDndHarness onAddField={onAddField} />);

    const draggable = screen.getByTestId('draggable-field-type');
    expect(draggable.getAttribute('aria-describedby')).toBeTruthy();

    draggable.focus();
    fireEvent.keyDown(draggable, { key: ' ', code: 'Space' });
    await waitFor(() => expect(screen.getByTestId('active-drag').textContent).toBe('field-type-text'));

    await new Promise((resolve) => window.setTimeout(resolve, 0));
    fireEvent.keyDown(document, { key: 'ArrowRight', code: 'ArrowRight' });
    await waitFor(() => expect(screen.getByTestId('field-dropzone').dataset.isOver).toBe('true'));

    fireEvent.keyDown(document, { key: ' ', code: 'Space' });
    await waitFor(() => expect(onAddField).toHaveBeenCalledTimes(1));
    expect(onAddField).toHaveBeenCalledWith(expect.objectContaining({ type: 'text' }));

    draggable.focus();
    fireEvent.keyDown(draggable, { key: ' ', code: 'Space' });
    await waitFor(() => expect(screen.getByTestId('active-drag').textContent).toBe('field-type-text'));

    await new Promise((resolve) => window.setTimeout(resolve, 0));
    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });
    await waitFor(() => expect(screen.getByTestId('active-drag').textContent).toBe(''));
    expect(onAddField).toHaveBeenCalledTimes(1);
  });
});
