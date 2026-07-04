# JsonSchemaEditor Root Node Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an editable root node to `JsonSchemaEditor` so it can represent any JSON Schema type (object/array/primitive) and expose `title`/`description` in the table view.

**Architecture:** Extract pure schema serialization functions into a separate `schema-utils.ts` module for testability. Extend the internal `SchemaField` model with `isRoot`. Update the table rendering and dispatch logic to treat root specially (no delete, no sibling add, no required checkbox). Keep the existing JSON/preview/table view modes intact.

**Tech Stack:** React, TypeScript, Vite, Vitest, @testing-library/react, jsdom, Tailwind CSS, shadcn/ui.

---

## File Structure

| File | Responsibility |
|------|----------------|
| `packages/json-schema-editor/src/schema-utils.ts` | Pure functions: `buildField`, `schemaToFields`, `fieldsToSchema`, `fieldToSchema`, `defaultChildrenForType`, `generateSampleData`, types `JsonSchemaType`, `JsonSchema`, `SchemaField`. |
| `packages/json-schema-editor/src/schema-utils.test.ts` | Unit tests for schema serialization. |
| `packages/json-schema-editor/src/json-schema-editor.tsx` | UI component, dispatch logic, history/undo-redo, view modes. Imports pure functions from `schema-utils.ts`. |
| `packages/json-schema-editor/src/index.ts` | Public exports (unchanged). |
| `packages/json-schema-editor/package.json` | Add test dependencies and `test` script. |
| `packages/json-schema-editor/vitest.config.ts` | Vitest config with jsdom environment and path aliases. |

---

## Task 1: Setup Testing Infrastructure

**Files:**
- Modify: `packages/json-schema-editor/package.json`
- Create: `packages/json-schema-editor/vitest.config.ts`

### Step 1.1: Add test devDependencies

Edit `packages/json-schema-editor/package.json` and add to `devDependencies`:

```json
"devDependencies": {
  "@testing-library/jest-dom": "^6.4.0",
  "@testing-library/react": "^15.0.0",
  "@testing-library/user-event": "^14.5.0",
  "@types/react": "^18.3.0",
  "@types/react-dom": "^18.3.0",
  "jsdom": "^24.0.0",
  "react": "^18.3.1",
  "react-dom": "^18.3.1",
  "typescript": "^5.4.5",
  "vite": "^5.2.11",
  "vitest": "^1.6.0"
}
```

### Step 1.2: Add test script

Edit `packages/json-schema-editor/package.json` scripts:

```json
"scripts": {
  "build": "tsc && vite build",
  "prepublishOnly": "npm run build",
  "test": "vitest run",
  "test:watch": "vitest"
}
```

### Step 1.3: Create vitest config

Create `packages/json-schema-editor/vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: [],
  },
  resolve: {
    alias: {
      '@cisri/core': path.resolve(__dirname, '../core/src/index.ts'),
    },
  },
});
```

### Step 1.4: Verify test runner works

Run:

```bash
pnpm install
pnpm --filter @cisri/json-schema-editor test
```

Expected: Vitest starts and exits with 0 tests (no failures).

---

## Task 2: Extract Pure Schema Functions

**Files:**
- Create: `packages/json-schema-editor/src/schema-utils.ts`
- Modify: `packages/json-schema-editor/src/json-schema-editor.tsx`

### Step 2.1: Create schema-utils.ts

Create `packages/json-schema-editor/src/schema-utils.ts` with the following content (extracted and slightly extended from the current component):

```ts
export type JsonSchemaType =
  | 'object'
  | 'array'
  | 'string'
  | 'number'
  | 'boolean'
  | 'integer';

export interface JsonSchema {
  type?: JsonSchemaType;
  title?: string;
  description?: string;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
}

export interface SchemaField {
  id: string;
  name: string;
  type: JsonSchemaType;
  required: boolean;
  description?: string;
  schema: JsonSchema;
  children: SchemaField[];
  expanded: boolean;
  isArrayItem?: boolean;
  isRoot?: boolean;
}

let globalIdCounter = 0;

export function generateId(): string {
  return `sf-${++globalIdCounter}`;
}

export function resetIdCounter(): void {
  globalIdCounter = 0;
}

export function defaultChildrenForType(type: JsonSchemaType): SchemaField[] {
  if (type === 'object') {
    return [buildField('field1', { type: 'string' }, new Set())];
  }
  if (type === 'array') {
    return [buildField('ITEMS', { type: 'string' }, new Set(), true)];
  }
  return [];
}

export function buildField(
  name: string,
  schema: JsonSchema,
  requiredSet: Set<string>,
  isArrayItem = false,
  isRoot = false
): SchemaField {
  const type = schema.type ?? 'object';
  const children: SchemaField[] = [];

  if (type === 'object' && schema.properties) {
    const childRequired = new Set(schema.required ?? []);
    for (const [childName, childSchema] of Object.entries(schema.properties)) {
      children.push(buildField(childName, childSchema, childRequired));
    }
  } else if (type === 'array' && schema.items) {
    children.push(buildField('ITEMS', schema.items, new Set(), true));
  }

  return {
    id: generateId(),
    name,
    type,
    required: requiredSet.has(name),
    description: schema.description,
    schema,
    children,
    expanded: true,
    isArrayItem,
    isRoot,
  };
}

export function schemaToFields(schema: JsonSchema): SchemaField[] {
  const root = buildField(schema.title ?? '', schema, new Set(), false, true);
  return [root];
}

export function buildEmptyField(): SchemaField {
  return buildField('', { type: 'string' }, new Set());
}

export function ensureAtLeastOneField(fields: SchemaField[]): SchemaField[] {
  return fields.length > 0 ? fields : [buildEmptyField()];
}

export function generateSampleData(schema: JsonSchema): unknown {
  switch (schema.type) {
    case 'string':
      return 'string';
    case 'number':
    case 'integer':
      return 0;
    case 'boolean':
      return true;
    case 'object': {
      const obj: Record<string, unknown> = {};
      if (schema.properties) {
        for (const [key, child] of Object.entries(schema.properties)) {
          obj[key] = generateSampleData(child);
        }
      }
      return obj;
    }
    case 'array': {
      if (schema.items) {
        return [generateSampleData(schema.items)];
      }
      return [];
    }
    default:
      return null;
  }
}

export function fieldsToSchema(fields: SchemaField[]): JsonSchema {
  if (fields.length !== 1 || !fields[0].isRoot) {
    throw new Error('fieldsToSchema expects exactly one root field');
  }
  return fieldToSchema(fields[0]);
}

export function fieldToSchema(field: SchemaField): JsonSchema {
  const base: JsonSchema = { ...field.schema };

  if (field.type === 'object') {
    const childSchema = fieldsToSchemaInner(field.children);
    return {
      ...base,
      type: field.type,
      title: field.isRoot ? field.name : base.title,
      description: field.description,
      properties: childSchema.properties,
      required: childSchema.required,
      items: undefined,
    };
  }

  if (field.type === 'array') {
    const itemField = field.children[0];
    return {
      ...base,
      type: field.type,
      title: field.isRoot ? field.name : base.title,
      description: field.description,
      items: itemField ? fieldToSchema(itemField) : { type: 'string' },
      properties: undefined,
      required: undefined,
    };
  }

  return {
    ...base,
    type: field.type,
    title: field.isRoot ? field.name : base.title,
    description: field.description,
    properties: undefined,
    items: undefined,
    required: undefined,
  };
}

function fieldsToSchemaInner(fields: SchemaField[]): {
  properties: Record<string, JsonSchema>;
  required: string[] | undefined;
} {
  const properties: Record<string, JsonSchema> = {};
  const required: string[] = [];

  for (const field of fields) {
    properties[field.name] = fieldToSchema(field);
    if (field.required) required.push(field.name);
  }

  return {
    properties,
    required: required.length > 0 ? required : undefined,
  };
}
```

### Step 2.2: Update json-schema-editor.tsx imports

Modify `packages/json-schema-editor/src/json-schema-editor.tsx`:

1. Remove the local type definitions for `JsonSchemaType`, `JsonSchema`, `SchemaField`.
2. Remove local helper functions: `generateId`, `defaultChildrenForType`, `buildField`, `schemaToFields`, `buildEmptyField`, `ensureAtLeastOneField`, `generateSampleData`, `fieldsToSchema`, `fieldToSchema`.
3. Add imports at the top:

```ts
import {
  type JsonSchema,
  type JsonSchemaType,
  type SchemaField,
  buildEmptyField,
  ensureAtLeastOneField,
  fieldToSchema,
  fieldsToSchema,
  generateSampleData,
  schemaToFields,
} from './schema-utils';
```

### Step 2.3: Run typecheck

Run:

```bash
pnpm --filter @cisri/json-schema-editor build
```

Expected: TypeScript compilation and Vite build succeed.

---

## Task 3: Add Unit Tests for Schema Serialization

**Files:**
- Create: `packages/json-schema-editor/src/schema-utils.test.ts`

### Step 3.1: Test schemaToFields creates root

Create `packages/json-schema-editor/src/schema-utils.test.ts`:

```ts
import { describe, expect, it, beforeEach } from 'vitest';
import {
  fieldsToSchema,
  resetIdCounter,
  schemaToFields,
} from './schema-utils';

beforeEach(() => {
  resetIdCounter();
});

describe('schemaToFields', () => {
  it('creates a single root field from an object schema', () => {
    const fields = schemaToFields({
      type: 'object',
      title: 'User',
      description: 'A user schema',
      properties: {
        name: { type: 'string' },
      },
      required: ['name'],
    });

    expect(fields).toHaveLength(1);
    const [root] = fields;
    expect(root.isRoot).toBe(true);
    expect(root.name).toBe('User');
    expect(root.type).toBe('object');
    expect(root.description).toBe('A user schema');
    expect(root.required).toBe(false);
    expect(root.children).toHaveLength(1);
    expect(root.children[0].name).toBe('name');
  });

  it('creates root for a primitive schema', () => {
    const fields = schemaToFields({ type: 'string' });
    expect(fields).toHaveLength(1);
    expect(fields[0].isRoot).toBe(true);
    expect(fields[0].type).toBe('string');
    expect(fields[0].children).toHaveLength(0);
  });
});
```

### Step 3.2: Test fieldsToSchema roundtrip for object root

Add to the same file:

```ts
describe('fieldsToSchema', () => {
  it('roundtrips an object schema through root', () => {
    const input = {
      type: 'object' as const,
      title: 'User',
      description: 'A user',
      properties: {
        name: { type: 'string' as const },
      },
      required: ['name'],
    };
    const schema = fieldsToSchema(schemaToFields(input));
    expect(schema).toEqual(input);
  });
});
```

### Step 3.3: Test root array serialization

Add:

```ts
  it('roundtrips an array of strings schema', () => {
    const input = {
      type: 'array' as const,
      title: 'Tags',
      items: { type: 'string' as const },
    };
    const schema = fieldsToSchema(schemaToFields(input));
    expect(schema).toEqual(input);
  });
```

### Step 3.4: Test root primitive serialization

Add:

```ts
  it('roundtrips a primitive string schema', () => {
    const input = {
      type: 'string' as const,
      title: 'Token',
      description: 'A token',
    };
    const schema = fieldsToSchema(schemaToFields(input));
    expect(schema).toEqual(input);
  });
```

### Step 3.5: Run unit tests

Run:

```bash
pnpm --filter @cisri/json-schema-editor test
```

Expected: All 5 tests pass.

---

## Task 4: Render Root Row in Table

**Files:**
- Modify: `packages/json-schema-editor/src/json-schema-editor.tsx`

### Step 4.1: Pass root field to table

In `JsonSchemaEditor` component, the table rendering currently maps over `fields` (which are top-level object properties). After Task 2, `fields` is `[root]`, so the existing render loop will render the root row. Update the rendering to pass `disableDelete={true}` for the root row:

```tsx
<TableBody>
  {fields.map((field) => (
    <SchemaFieldRow
      key={field.id}
      field={field}
      level={0}
      readOnly={readOnly}
      disableDelete={true}
      dispatch={dispatch}
    />
  ))}
</TableBody>
```

### Step 4.2: Update SchemaFieldRow for root

Modify `SchemaFieldRow` to check `field.isRoot`:

1. Required checkbox: render `null` when `field.isRoot`.
2. Actions: when `field.isRoot`, hide both add-sibling and delete buttons.
3. Visual style: add root background to the `TableRow`.

Example diff inside `SchemaFieldRow`:

```tsx
<TableRow className={cn(field.isRoot && 'bg-muted/30')}>
  ...
  <TableCell>
    {field.isArrayItem || field.isRoot ? null : (
      <Checkbox ... />
    )}
  </TableCell>
  ...
  <TableCell>
    {!readOnly && !field.isRoot && (
      <SchemaRowActions
        ...
        showAdd={!field.isArrayItem}
        showDelete={!field.isArrayItem}
        ...
      />
    )}
  </TableCell>
</TableRow>
```

### Step 4.3: Add component test for root rendering

Create `packages/json-schema-editor/src/json-schema-editor.test.tsx`:

```tsx
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
});
```

### Step 4.4: Run tests

Run:

```bash
pnpm --filter @cisri/json-schema-editor test
```

Expected: Tests pass. If `@testing-library/jest-dom` matchers are not auto-registered, add a `test/setup.ts` file and import `@testing-library/jest-dom/vitest`.

---

## Task 5: Handle Root Type Switching

**Files:**
- Modify: `packages/json-schema-editor/src/json-schema-editor.tsx`

### Step 5.1: Reset children when root type changes

`updateFieldById` already resets children on type change via `defaultChildrenForType`. Verify it works for root (it will, since root is just another field with an id). No code change needed if the existing logic is preserved after the refactor.

### Step 5.2: Prevent delete/addSibling on root

Update `dispatch` to early-return for root when action is `delete` or `addSibling`:

```ts
const dispatch = useCallback(
  (action: SchemaAction) => {
    const currentFields = editorStateRef.current.history[editorStateRef.current.index];
    const root = currentFields[0];

    if (
      root &&
      action.id === root.id &&
      (action.type === 'delete' || action.type === 'addSibling')
    ) {
      return;
    }

    // existing switch
  },
  [onChange, pushSnapshot]
);
```

### Step 5.3: Add component test for root type switch

Add to `json-schema-editor.test.tsx`:

```tsx
import userEvent from '@testing-library/user-event';

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
```

### Step 5.4: Run tests

Run:

```bash
pnpm --filter @cisri/json-schema-editor test
```

Expected: Tests pass.

---

## Task 6: Handle Edge Cases

**Files:**
- Modify: `packages/json-schema-editor/src/schema-utils.ts` (if needed)
- Modify: `packages/json-schema-editor/src/json-schema-editor.tsx`

### Step 6.1: Empty schema input

`schemaToFields({})` should produce a root with `type: 'object'`. The current `buildField` defaults type to `'object'`, so this works. Add a test:

```ts
it('defaults empty schema to object root', () => {
  const fields = schemaToFields({});
  expect(fields[0].type).toBe('object');
  expect(fields[0].isRoot).toBe(true);
});
```

### Step 6.2: JSON view sync

The JSON view already calls `schemaToFields(parsed)` when parsing. After Task 2, this returns `[root]` and `fieldsToSchema` converts it back. Verify by adding a component test:

```tsx
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
  await user.type(textarea, '{"type":"object","title":"Product","properties":{}}');

  const lastCall = onChange.mock.calls.at(-1)?.[0];
  expect(lastCall).toMatchObject({ type: 'object', title: 'Product' });
});
```

### Step 6.3: Undo/redo with root

Add a test that changes root title, undoes, and redoes:

```tsx
it('undo and redo root title changes', async () => {
  const user = userEvent.setup();
  render(
    <JsonSchemaEditor
      value={{ type: 'object', title: 'User', properties: {} }}
      onChange={vi.fn()}
    />
  );

  const titleInput = screen.getByDisplayValue('User');
  await user.clear(titleInput);
  await user.type(titleInput, 'Product');

  const undoButton = screen.getByRole('button', { name: '撤销' });
  await user.click(undoButton);
  expect(screen.getByDisplayValue('User')).toBeInTheDocument();

  const redoButton = screen.getByRole('button', { name: '恢复' });
  await user.click(redoButton);
  expect(screen.getByDisplayValue('Product')).toBeInTheDocument();
});
```

### Step 6.4: Run tests

Run:

```bash
pnpm --filter @cisri/json-schema-editor test
```

Expected: Tests pass.

---

## Task 7: Final Verification

### Step 7.1: Run all tests

```bash
pnpm --filter @cisri/json-schema-editor test
```

Expected: All tests pass.

### Step 7.2: Build the package

```bash
pnpm --filter @cisri/json-schema-editor build
```

Expected: Build succeeds with no TypeScript errors.

### Step 7.3: Verify docs demo

Run:

```bash
pnpm docs:dev
```

Manually verify:
1. The demo shows a root row with title "User".
2. Expanding root shows `name`, `age`, `email`, `preferences`.
3. Switching root type to `string` clears children.
4. JSON view shows `title: "User"`.

### Step 7.4: Commit

```bash
git add packages/json-schema-editor/
git commit -m "feat(json-schema-editor): add editable root node with title/description and primitive/array support"
```

---

## Spec Coverage Check

| Spec Requirement | Implementing Task |
|------------------|-------------------|
| root 节点名称对应 `title` | Task 2 `schema-utils.ts`, Task 4 tests |
| root 描述对应 `description` | Task 2 `schema-utils.ts`, Task 4 tests |
| root 类型可切换 | Task 2 `schema-utils.ts`, Task 5 |
| 支持单层 primitive/array schema | Task 2 `schema-utils.ts`, Task 3 tests |
| root 不可删除/新增同级 | Task 4, Task 5.2 |
| root 无 required 复选框 | Task 4.2 |
| 类型切换时清空 children | Task 2 `defaultChildrenForType`, Task 5.1 |
| JSON 视图双向同步 | Task 6.2 |
| undo/redo 包含 root | Task 6.3 |

## Placeholder Scan

No TBD/TODO/fill-in-details patterns remain. Every step contains exact file paths, code, and expected command output.

## Type Consistency Check

- `SchemaField` has `isRoot?: boolean` everywhere.
- `fieldsToSchema` signature is `fieldsToSchema(fields: SchemaField[]): JsonSchema` and assumes exactly one root.
- `schemaToFields` always returns `SchemaField[]` of length 1.
