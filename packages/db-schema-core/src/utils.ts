import type { DbColumn, DbTable } from './types';

let idCounter = 0;

/** 生成可读的唯一 ID，形如 `${prefix}-${n}`。 */
export function generateId(prefix = 'id'): string {
  return `${prefix}-${++idCounter}`;
}

/** 重置 ID 计数器，用于测试确定性。 */
export function resetIdCounter(): void {
  idCounter = 0;
}

/** 创建一个空列：默认 varchar、可空、无约束。 */
export function createEmptyColumn(name = ''): DbColumn {
  return {
    id: generateId('col'),
    name,
    type: 'varchar',
    nullable: true,
    primaryKey: false,
    unique: false,
  };
}

/** 创建一个空表：无列。 */
export function createEmptyTable(name = ''): DbTable {
  return {
    id: generateId('tbl'),
    name,
    columns: [],
  };
}