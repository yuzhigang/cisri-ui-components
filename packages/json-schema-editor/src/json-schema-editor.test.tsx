import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { useState } from 'react';
import userEvent from '@testing-library/user-event';
import { JsonSchemaEditor } from './json-schema-editor';

describe('JsonSchemaEditor root node', () => {
  it('renders root title and description in the table', () => {
    render(
      <JsonSchemaEditor
        value={{
          type: 'object',
          title: 'User',
          description: 'A user schema',
          properties: {
            name: { type: 'string' },
          },
        }}
        onChange={vi.fn()}
      />
    );

    expect(screen.getByDisplayValue('User')).toBeInTheDocument();
    expect(screen.getByDisplayValue('A user schema')).toBeInTheDocument();
  });

  it('renders nested properties under the root row', () => {
    render(
      <JsonSchemaEditor
        value={{
          type: 'object',
          title: 'User',
          properties: {
            name: { type: 'string' },
            age: { type: 'integer' },
          },
        }}
        onChange={vi.fn()}
      />
    );

    expect(screen.getByDisplayValue('User')).toBeInTheDocument();
    expect(screen.getByDisplayValue('name')).toBeInTheDocument();
    expect(screen.getByDisplayValue('age')).toBeInTheDocument();
  });

  it('does not show delete or add-sibling buttons on the root row', () => {
    render(
      <JsonSchemaEditor
        value={{
          type: 'object',
          title: 'User',
          properties: {
            name: { type: 'string' },
          },
        }}
        onChange={vi.fn()}
      />
    );

    const rootAddSiblingButton = screen.queryByRole('button', { name: /在字段 User 后添加行/ });
    expect(rootAddSiblingButton).not.toBeInTheDocument();

    const addSiblingButtons = screen.queryAllByRole('button', { name: /后添加行/ });
    expect(addSiblingButtons).toHaveLength(1); // only the child field has an add-sibling button

    const deleteButtons = screen.queryAllByRole('button', { name: /删除字段/ });
    expect(deleteButtons).toHaveLength(1); // only the child field has a delete button
  });

  it('clears children when root switches to primitive', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <JsonSchemaEditor
        value={{
          type: 'object',
          title: 'User',
          properties: { name: { type: 'string' } },
        }}
        onChange={onChange}
      />
    );

    const typeSelect = screen.getAllByRole('combobox')[0];
    await user.click(typeSelect);
    await user.click(screen.getByRole('option', { name: 'string' }));

    const lastCall = onChange.mock.calls.at(-1)?.[0];
    expect(lastCall).toMatchObject({ type: 'string', title: 'User' });
    expect(lastCall.properties).toBeUndefined();
    expect(lastCall.items).toBeUndefined();
  });

  it('does not delete the root row', () => {
    const onChange = vi.fn();
    render(
      <JsonSchemaEditor
        value={{
          type: 'object',
          title: 'User',
          properties: { name: { type: 'string' } },
        }}
        onChange={onChange}
      />
    );

    // There should be no delete button for the root row.
    const rootDeleteButton = screen.queryByRole('button', {
      name: '删除字段 User',
    });
    expect(rootDeleteButton).not.toBeInTheDocument();
  });

  it('syncs root title from JSON view', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <JsonSchemaEditor
        value={{ type: 'object', properties: {} }}
        onChange={onChange}
      />
    );

    const jsonButton = screen.getByRole('button', { name: 'JSON 视图' });
    await user.click(jsonButton);

    const textarea = screen.getByPlaceholderText('在此编辑或粘贴 JSON Schema...');
    await user.clear(textarea);
    await user.type(textarea, '{{"type":"object","title":"Product","properties":{{}}}}');

    const lastCall = onChange.mock.calls.at(-1)?.[0];
    expect(lastCall).toMatchObject({ type: 'object', title: 'Product' });
  });

  it('undo and redo root title changes', async () => {
    const user = userEvent.setup();
    function ControlledEditor({
      initial,
    }: {
      initial: { type: 'object'; title: string; properties: Record<string, never> };
    }) {
      const [value, setValue] = useState(initial);
      return (
        <JsonSchemaEditor
          value={value}
          onChange={(next) => setValue(next as typeof initial)}
        />
      );
    }
    render(
      <ControlledEditor
        initial={{ type: 'object', title: 'User', properties: {} }}
      />
    );

    const titleInput = screen.getByDisplayValue('User');
    fireEvent.change(titleInput, { target: { value: 'Product' } });
    await waitFor(() =>
      expect(screen.getByDisplayValue('Product')).toBeInTheDocument()
    );

    const undoButton = screen.getByRole('button', { name: '撤销' });
    await user.click(undoButton);
    expect(screen.getByDisplayValue('User')).toBeInTheDocument();

    const redoButton = screen.getByRole('button', { name: '恢复' });
    await user.click(redoButton);
    expect(screen.getByDisplayValue('Product')).toBeInTheDocument();
  });

  it('renders root array schema with ITEMS row', () => {
    render(
      <JsonSchemaEditor
        value={{
          type: 'array',
          title: 'Tags',
          items: { type: 'string' },
        }}
        onChange={vi.fn()}
      />
    );

    expect(screen.getByDisplayValue('Tags')).toBeInTheDocument();
    expect(screen.getByDisplayValue('ITEMS')).toBeInTheDocument();
  });
});
