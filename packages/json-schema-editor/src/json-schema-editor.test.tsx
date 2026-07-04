import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
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
});
