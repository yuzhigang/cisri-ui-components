import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { JsonSchemaUiEditor } from './json-schema-ui-editor';
import { generateDefaultUiSchema, type UiSchema } from '@cisri/json-schema-ui-core';

describe('JsonSchemaUiEditor', () => {
  it('renders the live preview form from schema + uiSchema', () => {
    const schema = {
      type: 'object' as const,
      properties: { name: { type: 'string' as const, title: 'Name' } },
    };
    render(
      <JsonSchemaUiEditor schema={schema} uiSchema={generateDefaultUiSchema(schema)} onChange={vi.fn()} />
    );
    expect(screen.getByLabelText('Name')).toBeInTheDocument();
  });

  it('renders a config button for each field including the root object', () => {
    const schema = {
      type: 'object' as const,
      properties: { name: { type: 'string' as const }, age: { type: 'integer' as const } },
    };
    render(
      <JsonSchemaUiEditor schema={schema} uiSchema={generateDefaultUiSchema(schema)} onChange={vi.fn()} />
    );
    expect(screen.getByLabelText('配置字段 name')).toBeInTheDocument();
    expect(screen.getByLabelText('配置字段 age')).toBeInTheDocument();
    expect(screen.getByLabelText('配置字段')).toBeInTheDocument(); // root object, path [] (no trailing space: testing-library trims DOM aria-label but not the query string)
  });

  it('opens the config popover and patches ui:hidden via the switch', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    const schema = {
      type: 'object' as const,
      properties: { name: { type: 'string' as const } },
    };
    const uiSchema = generateDefaultUiSchema(schema);
    render(<JsonSchemaUiEditor schema={schema} uiSchema={uiSchema} onChange={onChange} />);
    await user.click(screen.getByLabelText('配置字段 name'));
    await user.click(screen.getByRole('switch', { name: '隐藏字段' }));
    const emitted = onChange.mock.calls.at(-1)?.[0] as UiSchema;
    expect((emitted.name as UiSchema)['ui:hidden']).toBe(true);
  });

  it('does not render config buttons when readOnly', () => {
    const schema = {
      type: 'object' as const,
      properties: { name: { type: 'string' as const } },
    };
    render(
      <JsonSchemaUiEditor
        schema={schema}
        uiSchema={generateDefaultUiSchema(schema)}
        onChange={vi.fn()}
        readOnly
      />
    );
    expect(screen.queryByLabelText('配置字段 name')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('配置字段')).not.toBeInTheDocument();
  });
});