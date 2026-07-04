import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
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
});
