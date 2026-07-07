import { describe, expect, it, beforeEach } from 'vitest';
import {
  createEmptyColumn,
  createEmptyTable,
  generateId,
  resetIdCounter,
} from './utils';

describe('generateId', () => {
  beforeEach(() => resetIdCounter());

  it('produces sequential ids with the given prefix', () => {
    expect(generateId('col')).toBe('col-1');
    expect(generateId('col')).toBe('col-2');
  });

  it('defaults the prefix to "id"', () => {
    expect(generateId()).toBe('id-1');
  });
});

describe('createEmptyColumn', () => {
  beforeEach(() => resetIdCounter());

  it('returns a nullable varchar column with no constraints', () => {
    expect(createEmptyColumn()).toEqual({
      id: 'col-1',
      name: '',
      type: 'varchar',
      nullable: true,
      primaryKey: false,
      unique: false,
    });
  });

  it('uses the provided name', () => {
    expect(createEmptyColumn('email').name).toBe('email');
  });
});

describe('createEmptyTable', () => {
  beforeEach(() => resetIdCounter());

  it('returns a table with no columns', () => {
    expect(createEmptyTable()).toEqual({
      id: 'tbl-1',
      name: '',
      columns: [],
    });
  });

  it('uses the provided name', () => {
    expect(createEmptyTable('users').name).toBe('users');
  });
});

describe('resetIdCounter', () => {
  beforeEach(() => resetIdCounter());

  it('resets the counter so ids restart at 1', () => {
    generateId('x');
    generateId('x');
    resetIdCounter();
    expect(generateId('x')).toBe('x-1');
  });
});