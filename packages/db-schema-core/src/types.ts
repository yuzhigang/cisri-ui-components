/**
 * 数据库列类型。常见通用类型集合，可在后续按需扩展。
 */
export type DbColumnType =
  | 'varchar'
  | 'text'
  | 'integer'
  | 'bigint'
  | 'decimal'
  | 'boolean'
  | 'date'
  | 'timestamp'
  | 'uuid'
  | 'jsonb';

/** 数据库列定义 */
export interface DbColumn {
  id: string;
  name: string;
  type: DbColumnType;
  nullable: boolean;
  primaryKey: boolean;
  unique: boolean;
  defaultValue?: string;
  description?: string;
}

/** 数据库表定义 */
export interface DbTable {
  id: string;
  name: string;
  description?: string;
  columns: DbColumn[];
}