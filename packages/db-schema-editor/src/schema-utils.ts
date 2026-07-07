import type { DbColumn, DbTable } from '@cisri/db-schema-core';
import { createEmptyColumn } from '@cisri/db-schema-core';

/** 列字段的部分更新（不可更新 id）。 */
export type ColumnPatch = Partial<Omit<DbColumn, 'id'>>;

/** 更新指定列的字段，返回新表。 */
export function updateColumn(
  table: DbTable,
  id: string,
  patch: ColumnPatch
): DbTable {
  return {
    ...table,
    columns: table.columns.map((c) => (c.id === id ? { ...c, ...patch } : c)),
  };
}

/** 追加一个空列（默认 varchar、可空）。 */
export function addColumn(table: DbTable, name = ''): DbTable {
  return { ...table, columns: [...table.columns, createEmptyColumn(name)] };
}

/** 在指定列下方插入一个空列；找不到 id 时返回原表。 */
export function insertColumnBelow(table: DbTable, id: string): DbTable {
  const idx = table.columns.findIndex((c) => c.id === id);
  if (idx < 0) return table;
  const columns = [...table.columns];
  columns.splice(idx + 1, 0, createEmptyColumn());
  return { ...table, columns };
}

/** 按 id 删除列。 */
export function deleteColumn(table: DbTable, id: string): DbTable {
  return { ...table, columns: table.columns.filter((c) => c.id !== id) };
}

/** 将 fromId 列移动到 toId 列的位置（dnd-kit onDragEnd 语义：active 落到 over 的位置）；任一 id 不存在或相同时返回原表。 */
export function reorderColumns(table: DbTable, fromId: string, toId: string): DbTable {
  const from = table.columns.findIndex((c) => c.id === fromId);
  const to = table.columns.findIndex((c) => c.id === toId);
  if (from < 0 || to < 0 || from === to) return table;
  const columns = [...table.columns];
  const [moved] = columns.splice(from, 1);
  columns.splice(to, 0, moved);
  return { ...table, columns };
}

/** 更新表名。 */
export function updateTableName(table: DbTable, name: string): DbTable {
  return { ...table, name };
}

/** 更新表描述（传 undefined 清除）。 */
export function updateTableDescription(
  table: DbTable,
  description: string | undefined
): DbTable {
  return { ...table, description };
}

/** 深比较，用于历史去重与外部 value 同步判断。 */
export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a == null || b == null) return false;
  const aArr = Array.isArray(a);
  const bArr = Array.isArray(b);
  if (aArr !== bArr) return false;
  if (aArr) {
    const aa = a as unknown[];
    const bb = b as unknown[];
    return aa.length === bb.length && aa.every((v, i) => deepEqual(v, bb[i]));
  }
  const ao = a as Record<string, unknown>;
  const bo = b as Record<string, unknown>;
  const ak = Object.keys(ao);
  const bk = Object.keys(bo);
  return ak.length === bk.length && ak.every((k) => deepEqual(ao[k], bo[k]));
}