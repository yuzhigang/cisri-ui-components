import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { useState } from 'react';
import userEvent from '@testing-library/user-event';
import { DbSchemaEditor } from './db-schema-editor';
import type { DbTable } from '@cisri/db-schema-core';

function makeTable(): DbTable {
  return {
    id: 'tbl-1',
    name: 'users',
    columns: [
      { id: 'c1', name: 'id', type: 'uuid', nullable: false, primaryKey: true, unique: false },
      {
        id: 'c2',
        name: 'email',
        type: 'varchar',
        nullable: false,
        primaryKey: false,
        unique: true,
      },
    ],
  };
}

describe('DbSchemaEditor', () => {
  it('renders table name and column rows', () => {
    render(<DbSchemaEditor value={makeTable()} onChange={vi.fn()} />);
    expect(screen.getByDisplayValue('users')).toBeInTheDocument();
    expect(screen.getByDisplayValue('id')).toBeInTheDocument();
    expect(screen.getByDisplayValue('email')).toBeInTheDocument();
  });

  it('calls onChange when a column name is edited', () => {
    const onChange = vi.fn();
    render(<DbSchemaEditor value={makeTable()} onChange={onChange} />);
    fireEvent.change(screen.getByDisplayValue('id'), { target: { value: 'user_id' } });
    const last = onChange.mock.calls.at(-1)?.[0];
    expect(last.columns[0].name).toBe('user_id');
  });

  it('calls onChange when the type select changes', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DbSchemaEditor value={makeTable()} onChange={onChange} />);
    await user.click(screen.getAllByRole('combobox')[0]);
    await user.click(screen.getByRole('option', { name: 'integer' }));
    const last = onChange.mock.calls.at(-1)?.[0];
    expect(last.columns[0].type).toBe('integer');
  });

  it('inserts a column below the target row via the row add button', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DbSchemaEditor value={makeTable()} onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: '在列 id 下方添加列' }));
    const last = onChange.mock.calls.at(-1)?.[0];
    expect(last.columns).toHaveLength(3);
    expect(last.columns[0].name).toBe('id');
    expect(last.columns[1].name).toBe('');
    expect(last.columns[2].name).toBe('email');
  });

  it('deletes a column', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DbSchemaEditor value={makeTable()} onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: '删除列 id' }));
    const last = onChange.mock.calls.at(-1)?.[0];
    expect(last.columns).toHaveLength(1);
    expect(last.columns[0].name).toBe('email');
  });

  it('renders a drag handle for each column row', () => {
    render(<DbSchemaEditor value={makeTable()} onChange={vi.fn()} />);
    expect(screen.getByLabelText('拖动列 id 排序')).toBeInTheDocument();
    expect(screen.getByLabelText('拖动列 email 排序')).toBeInTheDocument();
  });

  it('undo and redo column edits', async () => {
    const user = userEvent.setup();
    function Controlled() {
      const [value, setValue] = useState<DbTable>(makeTable());
      return <DbSchemaEditor value={value} onChange={setValue} />;
    }
    render(<Controlled />);
    fireEvent.change(screen.getByDisplayValue('id'), { target: { value: 'user_id' } });
    await waitFor(() => expect(screen.getByDisplayValue('user_id')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: '撤销' }));
    expect(screen.getByDisplayValue('id')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '恢复' }));
    expect(screen.getByDisplayValue('user_id')).toBeInTheDocument();
  });

  it('hides action buttons when readOnly', () => {
    render(<DbSchemaEditor value={makeTable()} onChange={vi.fn()} readOnly />);
    expect(screen.queryByRole('button', { name: '在列 id 下方添加列' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '删除列 id' })).not.toBeInTheDocument();
  });

  it('shows a placeholder empty row when the table has no columns', () => {
    render(<DbSchemaEditor value={{ id: 't1', name: 'empty', columns: [] }} onChange={vi.fn()} />);
    const nameInput = screen.getByRole('textbox', { name: '列 未命名 名称' });
    expect(nameInput).toBeInTheDocument();
    expect(nameInput).toHaveValue('');
    expect(screen.getByRole('button', { name: '在列 未命名 下方添加列' })).toBeInTheDocument();
  });

  it('materializes the placeholder into a real column on first edit', () => {
    const onChange = vi.fn();
    render(<DbSchemaEditor value={{ id: 't1', name: 'empty', columns: [] }} onChange={onChange} />);
    fireEvent.change(screen.getByRole('textbox', { name: '列 未命名 名称' }), {
      target: { value: 'x' },
    });
    const last = onChange.mock.calls.at(-1)?.[0];
    expect(last.columns).toHaveLength(1);
    expect(last.columns[0].name).toBe('x');
    expect(last.columns[0].type).toBe('varchar');
  });
});