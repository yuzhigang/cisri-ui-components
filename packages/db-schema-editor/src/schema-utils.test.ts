import { describe, expect, it, beforeEach } from 'vitest';
import { createEmptyTable, resetIdCounter } from '@cisri/db-schema-core';
import {
  addColumn,
  deleteColumn,
  deepEqual,
  insertColumnBelow,
  reorderColumns,
  updateColumn,
  updateTableDescription,
  updateTableName,
} from './schema-utils';

beforeEach(() => resetIdCounter());

describe('updateColumn', () => {
  it('patches the matching column and leaves others untouched', () => {
    let table = createEmptyTable('users');
    table = addColumn(table, 'id');
    table = addColumn(table, 'email');
    const updated = updateColumn(table, table.columns[0].id, {
      type: 'uuid',
      nullable: false,
    });
    expect(updated.columns[0]).toMatchObject({ name: 'id', type: 'uuid', nullable: false });
    expect(updated.columns[1]).toEqual(table.columns[1]);
  });
});

describe('addColumn', () => {
  it('appends a varchar nullable column', () => {
    const table = addColumn(createEmptyTable('users'), 'name');
    expect(table.columns).toHaveLength(1);
    expect(table.columns[0]).toMatchObject({ name: 'name', type: 'varchar', nullable: true });
  });
});

describe('insertColumnBelow', () => {
  it('inserts an empty column after the matching id', () => {
    let table = addColumn(createEmptyTable('users'), 'a');
    table = addColumn(table, 'b');
    const aId = table.columns[0].id;
    const next = insertColumnBelow(table, aId);
    expect(next.columns).toHaveLength(3);
    expect(next.columns[0].name).toBe('a');
    expect(next.columns[1].name).toBe('');
    expect(next.columns[2].name).toBe('b');
  });

  it('returns the table unchanged when id is not found', () => {
    const table = addColumn(createEmptyTable('users'), 'a');
    expect(insertColumnBelow(table, 'missing')).toBe(table);
  });
});

describe('deleteColumn', () => {
  it('removes the column by id', () => {
    let table = addColumn(createEmptyTable('users'), 'a');
    table = addColumn(table, 'b');
    const id = table.columns[0].id;
    const next = deleteColumn(table, id);
    expect(next.columns).toHaveLength(1);
    expect(next.columns[0].name).toBe('b');
  });
});

describe('reorderColumns', () => {
  it('moves fromId to toId position (dnd-kit onDragEnd semantics)', () => {
    let table = addColumn(createEmptyTable('users'), 'a');
    table = addColumn(table, 'b');
    table = addColumn(table, 'c');
    const aId = table.columns[0].id;
    const bId = table.columns[1].id;
    const cId = table.columns[2].id;

    expect(reorderColumns(table, cId, aId).columns.map((c) => c.name)).toEqual(['c', 'a', 'b']);
    expect(reorderColumns(table, aId, cId).columns.map((c) => c.name)).toEqual(['b', 'c', 'a']);
    expect(reorderColumns(table, aId, bId).columns.map((c) => c.name)).toEqual(['b', 'a', 'c']);
  });

  it('returns the table unchanged when ids match or are missing', () => {
    let table = addColumn(createEmptyTable('users'), 'a');
    table = addColumn(table, 'b');
    const aId = table.columns[0].id;
    expect(reorderColumns(table, aId, aId)).toBe(table);
    expect(reorderColumns(table, aId, 'missing')).toBe(table);
  });
});

describe('updateTableName / updateTableDescription', () => {
  it('updates name and description', () => {
    const table = createEmptyTable('users');
    expect(updateTableName(table, 'orders').name).toBe('orders');
    expect(updateTableDescription(table, 'desc').description).toBe('desc');
    expect(updateTableDescription(table, undefined).description).toBeUndefined();
  });
});

describe('deepEqual', () => {
  it('compares primitives, arrays and objects', () => {
    expect(deepEqual(1, 1)).toBe(true);
    expect(deepEqual(1, 2)).toBe(false);
    expect(deepEqual([1, 2], [1, 2])).toBe(true);
    expect(deepEqual({ a: 1 }, { a: 1 })).toBe(true);
    expect(deepEqual({ a: 1 }, { a: 2 })).toBe(false);
    expect(deepEqual(null, null)).toBe(true);
    expect(deepEqual(null, undefined)).toBe(false);
  });
});