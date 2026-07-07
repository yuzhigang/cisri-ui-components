# json-schema-form Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `@cisri/json-schema-form` — a RJSF-style form renderer that takes a `JsonSchema` + optional `uiSchema` + `value` and renders an editable form (basic types + object/array nesting + enum + ui:* hints + controlled + validation + a `renderFieldActions` hook for the later ui-editor).

**Architecture:** Rename the existing `packages/json-editor/` stub → `packages/json-schema-form/`. Pure controlled component (`value`/`onChange`). A recursive `FieldRenderer` renders by schema type + `ui:widget`; object → ordered properties (local `onChange` produces new object refs); array → items + add/remove; primitive → widget (`@cisri/shadcn` atoms + native radio). `validateForm` checks `required` + emptiness → `onError`. `renderFieldActions` injects per-field actions (the ui-editor integration point). Depends on `@cisri/json-schema-ui-core` (already merged to master).

**Tech Stack:** React 18, TypeScript, `@cisri/shadcn` (Input/Textarea/Checkbox/Select/Label), `@cisri/json-schema-core` (JsonSchema), `@cisri/json-schema-ui-core` (UiSchema + generateDefaultUiSchema), Vite lib build, Vitest + @testing-library/react.

**Spec:** [docs/superpowers/specs/2026-07-06-json-schema-form-ui-editor-design.md](../specs/2026-07-06-json-schema-form-ui-editor-design.md) — implements the `@cisri/json-schema-form` section (Phase 1, step 2).

**Branch:** work on `feat/json-schema-form` (created in Task 1). Base = `master` (currently at `177d60e` after Plan 1 merged).

---

## File Structure

```
packages/json-schema-form/            # renamed from packages/json-editor/
├── package.json                       # @cisri/json-schema-form; deps core/json-schema-core/json-schema-ui-core/shadcn; peers react/react-dom/lucide-react
├── vite.config.ts                     # name JsonSchemaForm
├── tsconfig.json
├── vitest.config.ts                   # alias @cisri/core, @cisri/json-schema-core, @cisri/json-schema-ui-core, @cisri/shadcn → src
├── test/setup.ts
├── README.md
└── src/
    ├── index.ts                       # export JsonSchemaForm + types
    ├── json-schema-form.tsx           # main component + recursive FieldRenderer + renderWidget
    ├── form-utils.ts                  # validateForm
    ├── form-utils.test.ts
    └── json-schema-form.test.tsx

packages/shadcn/src/ui/label.tsx       # NEW Label atom (form uses it)
packages/shadcn/package.json           # add @radix-ui/react-label peer
packages/shadcn/src/index.ts           # export * from './ui/label'
```

**Note on controlled updates:** no `updateValueAtPath` helper — each `FieldRenderer` level receives a LOCAL `onChange` that updates its own slot (object: `{...value, [name]: v}`; array: `value.map(...)`), so new refs propagate up naturally.

---

### Task 1: Rename json-editor → json-schema-form, scaffold, add Label atom

**Files:**
- Move: `packages/json-editor/` → `packages/json-schema-form/` (filesystem rename)
- Modify: `packages/json-schema-form/package.json`, `vite.config.ts`, `vitest.config.ts`, `README.md`, `src/index.ts`
- Replace stubs: `src/json-schema-form.tsx` (new, minimal), `src/form-utils.ts` (new, minimal), delete `src/json-editor.tsx`, `src/form-utils.test.ts` (old todo), `src/json-editor.test.tsx` (old todo)
- Create: `packages/shadcn/src/ui/label.tsx`; Modify: `packages/shadcn/package.json`, `packages/shadcn/src/index.ts`

- [ ] **Step 1: Create branch + rename dir**

```bash
cd d:/30-Code/AI_Test/001-ui-components
git checkout -b feat/json-schema-form
mv packages/json-editor packages/json-schema-form
```

- [ ] **Step 2: Rewrite `packages/json-schema-form/package.json`** (full content):

```json
{
  "name": "@cisri/json-schema-form",
  "version": "1.0.0",
  "description": "Schema-driven JSON data form editor based on shadcn/ui (RJSF-style uiSchema)",
  "type": "module",
  "main": "./dist/index.js",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    }
  },
  "files": ["dist"],
  "sideEffects": false,
  "scripts": {
    "build": "tsc && vite build",
    "prepublishOnly": "npm run build",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "publishConfig": { "access": "public" },
  "dependencies": {
    "@cisri/core": "workspace:*",
    "@cisri/json-schema-core": "workspace:*",
    "@cisri/json-schema-ui-core": "workspace:*",
    "@cisri/shadcn": "workspace:*"
  },
  "peerDependencies": {
    "react": "^18.0.0 || ^19.0.0",
    "react-dom": "^18.0.0 || ^19.0.0",
    "lucide-react": "^0.300.0"
  },
  "peerDependenciesMeta": {
    "lucide-react": { "optional": false }
  },
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
    "vitest": "^1.6.0",
    "@vitejs/plugin-react": "^4.2.0"
  }
}
```

- [ ] **Step 3: Rewrite `vite.config.ts`** (change `name`):

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import pkg from './package.json' with { type: 'json' };

const { peerDependencies, dependencies } = pkg;

export default defineConfig({
  plugins: [react()],
  build: {
    emptyOutDir: false,
    lib: {
      entry: './src/index.ts',
      name: 'JsonSchemaForm',
      fileName: 'index',
      formats: ['es', 'cjs'],
    },
    rollupOptions: {
      external: [
        ...Object.keys(peerDependencies),
        ...Object.keys(dependencies),
        'react/jsx-runtime',
      ],
    },
  },
});
```

- [ ] **Step 4: Rewrite `vitest.config.ts`** (add `@cisri/json-schema-ui-core` alias):

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./test/setup.ts'],
  },
  resolve: {
    alias: {
      '@cisri/core': path.resolve(__dirname, '../core/src'),
      '@cisri/json-schema-core': path.resolve(__dirname, '../json-schema-core/src'),
      '@cisri/json-schema-ui-core': path.resolve(__dirname, '../json-schema-ui-core/src'),
      '@cisri/shadcn': path.resolve(__dirname, '../shadcn/src'),
    },
  },
});
```

- [ ] **Step 5: Replace src stubs.** Delete `src/json-editor.tsx`, `src/form-utils.ts` (old stub), `src/form-utils.test.ts`, `src/json-editor.test.tsx`. Create:

`src/json-schema-form.tsx` (minimal stub, real impl in later tasks):
```ts
export function JsonSchemaForm() {
  return null;
}
```

`src/form-utils.ts` (minimal stub):
```ts
export function validateForm(): string[] {
  return [];
}
```

`src/index.ts`:
```ts
export { JsonSchemaForm } from './json-schema-form';
export type { JsonSchemaFormProps } from './json-schema-form';
```

(Add the `JsonSchemaFormProps` interface to `json-schema-form.tsx` now too, so `index.ts` resolves:)
```ts
export interface JsonSchemaFormProps {
  schema: unknown;
  value: unknown;
  onChange: (value: unknown) => void;
}
```

- [ ] **Step 6: Add `Label` atom to `@cisri/shadcn`.** Create `packages/shadcn/src/ui/label.tsx`:

```tsx
import * as React from 'react';
import * as LabelPrimitive from '@radix-ui/react-label';
import { cn } from '@cisri/core';

const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn(
      'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
      className
    )}
    {...props}
  />
));
Label.displayName = LabelPrimitive.Root.displayName;

export { Label };
```

Add to `packages/shadcn/src/index.ts` (append a line):
```ts
export * from './ui/label';
```

Add `@radix-ui/react-label` to `packages/shadcn/package.json` peerDependencies + peerDependenciesMeta:
```json
    "@radix-ui/react-label": "^2.0.0",
```
(in peerDependencies, alphabetically after `@radix-ui/react-dialog`) and
```json
    "@radix-ui/react-label": { "optional": true },
```
(in peerDependenciesMeta).

- [ ] **Step 7: Install + build**

Run: `CI=true pnpm install --no-frozen-lockfile`
Expected: succeeds; `@cisri/json-editor` removed from lockfile, `@cisri/json-schema-form` added; `@radix-ui/react-label` auto-installed.

Run: `CI=true pnpm --filter @cisri/json-schema-form build`
Expected: `tsc && vite build` succeeds (stub component); `dist/index.js` etc. produced.

Run: `CI=true pnpm --filter @cisri/shadcn build`
Expected: succeeds; `dist` now includes `Label`.

- [ ] **Step 8: Commit**

```bash
git add packages/json-schema-form packages/shadcn/src/ui/label.tsx packages/shadcn/src/index.ts packages/shadcn/package.json pnpm-lock.yaml
git commit -m "feat(json-schema-form): rename from json-editor + scaffold + Label atom"
```

---

### Task 2: Implement `validateForm` (TDD)

**Files:**
- Modify: `packages/json-schema-form/src/form-utils.ts`
- Create: `packages/json-schema-form/src/form-utils.test.ts`

- [ ] **Step 1: Write failing test `src/form-utils.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { validateForm } from './form-utils';

describe('validateForm', () => {
  it('reports required object fields that are empty/missing', () => {
    const schema = {
      type: 'object' as const,
      properties: { name: { type: 'string' as const }, age: { type: 'integer' as const } },
      required: ['name'],
    };
    expect(validateForm(schema, {})).toEqual(['name is required']);
    expect(validateForm(schema, { name: '' })).toEqual(['name is required']);
    expect(validateForm(schema, { name: 'x' })).toEqual([]);
  });

  it('returns no errors when there are no required fields', () => {
    expect(validateForm({ type: 'object', properties: { x: { type: 'string' } } }, {})).toEqual([]);
  });

  it('handles non-object schemas (no required check)', () => {
    expect(validateForm({ type: 'string' }, 'x')).toEqual([]);
    expect(validateForm({ type: 'string' }, '')).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test → fail**

Run: `CI=true pnpm --filter @cisri/json-schema-form test`
Expected: FAIL — `validateForm` returns `[]` always (stub), so the first assertion `toEqual(['name is required'])` fails.

- [ ] **Step 3: Implement `src/form-utils.ts`**

```ts
import type { JsonSchema } from '@cisri/json-schema-core';

export function validateForm(schema: JsonSchema, value: unknown): string[] {
  const errors: string[] = [];
  if (schema.type === 'object' && schema.properties) {
    const required = new Set(schema.required ?? []);
    const obj = (value ?? {}) as Record<string, unknown>;
    for (const name of Object.keys(schema.properties)) {
      if (required.has(name) && (obj[name] == null || obj[name] === '')) {
        errors.push(`${name} is required`);
      }
    }
  }
  return errors;
}
```

- [ ] **Step 4: Run test → pass**

Run: `CI=true pnpm --filter @cisri/json-schema-form test`
Expected: PASS — `Tests 3 passed`.

- [ ] **Step 5: Commit**

```bash
git add packages/json-schema-form/src/form-utils.ts packages/json-schema-form/src/form-utils.test.ts
git commit -m "feat(json-schema-form): validateForm"
```

---

### Task 3: FieldRenderer + string/number widgets + label/placeholder + controlled

**Files:**
- Modify: `packages/json-schema-form/src/json-schema-form.tsx`
- Create: `packages/json-schema-form/src/json-schema-form.test.tsx`

This task builds the recursive `FieldRenderer` core + string widgets (text/textarea/password/color/date) + number widgets (updown/range) + label + placeholder + the controlled `onChange` flow. Object/array/enum/boolean-radio come in later tasks (but the FieldRenderer structure is established here).

- [ ] **Step 1: Write failing test `src/json-schema-form.test.tsx`**

```tsx
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { JsonSchemaForm } from './json-schema-form';

describe('JsonSchemaForm primitives', () => {
  it('renders a text input for a string field with label', () => {
    render(
      <JsonSchemaForm
        schema={{ type: 'object', properties: { name: { type: 'string', title: 'Name' } } }}
        value={{ name: '' }}
        onChange={vi.fn()}
      />
    );
    expect(screen.getByLabelText('Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toHaveValue('');
  });

  it('calls onChange when a string field is edited', () => {
    const onChange = vi.fn();
    render(
      <JsonSchemaForm
        schema={{ type: 'object', properties: { name: { type: 'string' } } }}
        value={{ name: '' }}
        onChange={onChange}
      />
    );
    fireEvent.change(screen.getByLabelText('name'), { target: { value: 'x' } });
    expect(onChange.mock.calls.at(-1)?.[0]).toEqual({ name: 'x' });
  });

  it('renders a number input for an integer field and converts to number', () => {
    const onChange = vi.fn();
    render(
      <JsonSchemaForm
        schema={{ type: 'object', properties: { age: { type: 'integer' } } }}
        value={{ age: 0 }}
        onChange={onChange}
      />
    );
    const input = screen.getByLabelText('age');
    fireEvent.change(input, { target: { value: '7' } });
    expect(onChange.mock.calls.at(-1)?.[0]).toEqual({ age: 7 });
  });

  it('uses ui:widget textarea + ui:placeholder', () => {
    render(
      <JsonSchemaForm
        schema={{ type: 'object', properties: { bio: { type: 'string' } } }}
        uiSchema={{ bio: { 'ui:widget': 'textarea', 'ui:placeholder': 'Tell your story' } }}
        value={{ bio: '' }}
        onChange={vi.fn()}
      />
    );
    expect(screen.getByPlaceholderText('Tell your story')).toBeInTheDocument();
  });

  it('uses ui:label to override the label', () => {
    render(
      <JsonSchemaForm
        schema={{ type: 'object', properties: { name: { type: 'string' } } }}
        uiSchema={{ name: { 'ui:label': 'Full Name' } }}
        value={{ name: '' }}
        onChange={vi.fn()}
      />
    );
    expect(screen.getByLabelText('Full Name')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test → fail**

Run: `CI=true pnpm --filter @cisri/json-schema-form test`
Expected: FAIL — `JsonSchemaForm` renders `null` (stub), so `getByLabelText` throws "not found".

- [ ] **Step 3: Implement `src/json-schema-form.tsx`** (full content — this establishes the FieldRenderer core):

```tsx
import {
  Input,
  Label,
  Textarea,
} from '@cisri/shadcn';
import { cn } from '@cisri/core';
import type { JsonSchema } from '@cisri/json-schema-core';
import {
  generateDefaultUiSchema,
  type UiSchema,
  type UiWidget,
} from '@cisri/json-schema-ui-core';

export interface JsonSchemaFormProps {
  schema: JsonSchema;
  uiSchema?: UiSchema;
  value: unknown;
  onChange: (value: unknown) => void;
  onError?: (errors: string[]) => void;
  readOnly?: boolean;
  className?: string;
  renderFieldActions?: (ctx: {
    path: string[];
    uiSchema: UiSchema | undefined;
    schema: JsonSchema;
  }) => React.ReactNode;
}

function defaultWidget(schema: JsonSchema): UiWidget {
  if (schema.enum) return 'select';
  switch (schema.type) {
    case 'number':
    case 'integer':
      return 'updown';
    case 'boolean':
      return 'checkbox';
    case 'string':
    default:
      return 'text';
  }
}

interface FieldRendererProps {
  schema: JsonSchema;
  uiSchema: UiSchema | undefined;
  path: string[];
  value: unknown;
  onChange: (value: unknown) => void;
  readOnly?: boolean;
  required?: boolean;
  renderFieldActions?: JsonSchemaFormProps['renderFieldActions'];
}

function FieldRenderer({
  schema,
  uiSchema,
  path,
  value,
  onChange,
  readOnly,
  required,
  renderFieldActions,
}: FieldRendererProps) {
  const widget = uiSchema?.['ui:widget'] ?? defaultWidget(schema);
  if (uiSchema?.['ui:hidden'] === true || widget === 'hidden') return null;

  const labelText =
    uiSchema?.['ui:label'] === false
      ? null
      : (uiSchema?.['ui:label'] as string | undefined) ?? schema.title ?? path[path.length - 1];
  const help = uiSchema?.['ui:help'] as string | undefined;
  const placeholder = uiSchema?.['ui:placeholder'] as string | undefined;
  const disabled = readOnly === true || uiSchema?.['ui:disabled'] === true;
  const readonly = readOnly === true || uiSchema?.['ui:readonly'] === true;
  const classNames = uiSchema?.['ui:classNames'] as string | undefined;
  const autoFocus = uiSchema?.['ui:autofocus'] === true;
  const fieldId = `jsf-${path.join('.')}`;

  // OBJECT
  if (schema.type === 'object' && schema.properties) {
    const order = (uiSchema?.['ui:order'] as string[] | undefined) ?? Object.keys(schema.properties);
    const requiredSet = new Set(schema.required ?? []);
    const obj = (value ?? {}) as Record<string, unknown>;
    return (
      <fieldset className={cn('space-y-3', classNames)}>
        {labelText && <legend className="text-sm font-medium">{labelText}</legend>}
        {order.map((name) => (
          <FieldRenderer
            key={name}
            schema={schema.properties![name]}
            uiSchema={uiSchema?.[name] as UiSchema | undefined}
            path={[...path, name]}
            value={obj[name]}
            onChange={(v) => onChange({ ...obj, [name]: v })}
            readOnly={readOnly}
            required={requiredSet.has(name)}
            renderFieldActions={renderFieldActions}
          />
        ))}
      </fieldset>
    );
  }

  // ARRAY (basic — items + add/remove; refined in Task 6)
  if (schema.type === 'array' && schema.items) {
    const arr = Array.isArray(value) ? value : [];
    const itemUi = uiSchema?.items as UiSchema | undefined;
    return (
      <fieldset className={cn('space-y-2', classNames)}>
        {labelText && <legend className="text-sm font-medium">{labelText}</legend>}
        {arr.map((item, i) => (
          <div key={i} className="flex items-start gap-2">
            <FieldRenderer
              schema={schema.items!}
              uiSchema={itemUi}
              path={[...path, String(i)]}
              value={item}
              onChange={(v) => onChange(arr.map((x, j) => (j === i ? v : x)))}
              readOnly={readOnly}
              renderFieldActions={renderFieldActions}
            />
            {!readOnly && (
              <button type="button" onClick={() => onChange(arr.filter((_, j) => j !== i))} aria-label={`删除第 ${i + 1} 项`}>
                ×
              </button>
            )}
          </div>
        ))}
        {!readOnly && (
          <button type="button" onClick={() => onChange([...arr, undefined])}>
            添加一项
          </button>
        )}
      </fieldset>
    );
  }

  // PRIMITIVE
  const actions = renderFieldActions?.({ path, uiSchema, schema });
  return (
    <div className={cn('space-y-1', classNames)}>
      {labelText && (
        <Label htmlFor={fieldId}>
          {labelText}
          {required && <span className="text-destructive"> *</span>}
        </Label>
      )}
      {renderPrimitive(widget, schema, fieldId, value, onChange, {
        placeholder,
        disabled,
        readonly,
        autoFocus,
      })}
      {help && <p className="text-xs text-muted-foreground">{help}</p>}
      {actions && <div className="mt-1">{actions}</div>}
    </div>
  );
}

interface WidgetHints {
  placeholder?: string;
  disabled?: boolean;
  readonly?: boolean;
  autoFocus?: boolean;
}

function renderPrimitive(
  widget: UiWidget,
  schema: JsonSchema,
  id: string,
  value: unknown,
  onChange: (v: unknown) => void,
  hints: WidgetHints
) {
  const { placeholder, disabled, readonly, autoFocus } = hints;
  switch (widget) {
    case 'textarea':
      return (
        <Textarea
          id={id}
          value={(value as string) ?? ''}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={readonly}
          autoFocus={autoFocus}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case 'password':
    case 'color':
    case 'date':
    case 'text':
      return (
        <Input
          id={id}
          type={widget}
          value={(value as string) ?? ''}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={readonly}
          autoFocus={autoFocus}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case 'updown':
      return (
        <Input
          id={id}
          type="number"
          value={(value as number | string) ?? ''}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={readonly}
          autoFocus={autoFocus}
          onChange={(e) =>
            onChange(e.target.value === '' ? undefined : Number(e.target.value))
          }
        />
      );
    case 'range':
      return (
        <Input
          id={id}
          type="range"
          value={(value as number) ?? 0}
          disabled={disabled}
          readOnly={readonly}
          autoFocus={autoFocus}
          onChange={(e) => onChange(Number(e.target.value))}
        />
      );
    default:
      // checkbox / radio / select handled in Task 4
      return (
        <Input
          id={id}
          value={(value as string) ?? ''}
          placeholder={placeholder}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        />
      );
  }
}

export function JsonSchemaForm({
  schema,
  uiSchema,
  value,
  onChange,
  onError,
  readOnly,
  className,
  renderFieldActions,
}: JsonSchemaFormProps) {
  const effectiveUi = uiSchema ?? generateDefaultUiSchema(schema);
  return (
    <div className={cn('space-y-3', className)}>
      <FieldRenderer
        schema={schema}
        uiSchema={effectiveUi}
        path={[]}
        value={value}
        onChange={onChange}
        readOnly={readOnly}
        renderFieldActions={renderFieldActions}
      />
    </div>
  );
}
```

> Note: `onError`/validation wiring is added in Task 9. The `useEffect` for it isn't needed yet.

- [ ] **Step 4: Run test → pass**

Run: `CI=true pnpm --filter @cisri/json-schema-form test`
Expected: PASS — `Tests 5 passed`.

- [ ] **Step 5: Commit**

```bash
git add packages/json-schema-form/src/json-schema-form.tsx packages/json-schema-form/src/json-schema-form.test.tsx
git commit -m "feat(json-schema-form): FieldRenderer + string/number widgets + controlled"
```

---

### Task 4: Boolean + enum widgets (checkbox / radio / select)

**Files:**
- Modify: `packages/json-schema-form/src/json-schema-form.tsx` (extend `renderPrimitive`)
- Modify: `packages/json-schema-form/src/json-schema-form.test.tsx` (append tests)

- [ ] **Step 1: Append tests**

```tsx
describe('JsonSchemaForm boolean + enum', () => {
  it('renders a checkbox for boolean and toggles true/false', () => {
    const onChange = vi.fn();
    render(
      <JsonSchemaForm
        schema={{ type: 'object', properties: { active: { type: 'boolean' } } }}
        value={{ active: false }}
        onChange={onChange}
      />
    );
    const cb = screen.getByRole('checkbox', { name: 'active' });
    fireEvent.click(cb);
    expect(onChange.mock.calls.at(-1)?.[0]).toEqual({ active: true });
  });

  it('renders a select for enum and changes value', async () => {
    const onChange = vi.fn();
    const { userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    render(
      <JsonSchemaForm
        schema={{ type: 'object', properties: { color: { type: 'string', enum: ['red', 'green', 'blue'] } } }}
        value={{ color: 'red' }}
        onChange={onChange}
      />
    );
    await user.click(screen.getByRole('combobox'));
    await user.click(screen.getByRole('option', { name: 'green' }));
    expect(onChange.mock.calls.at(-1)?.[0]).toEqual({ color: 'green' });
  });

  it('renders radio buttons for a boolean with ui:widget radio', () => {
    render(
      <JsonSchemaForm
        schema={{ type: 'object', properties: { active: { type: 'boolean' } } }}
        uiSchema={{ active: { 'ui:widget': 'radio' } }}
        value={{ active: false }}
        onChange={vi.fn()}
      />
    );
    expect(screen.getByRole('radio', { name: /true/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /false/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test → fail**

Run: `CI=true pnpm --filter @cisri/json-schema-form test`
Expected: FAIL — boolean renders the default `<Input>` (no checkbox), so `getByRole('checkbox')` throws.

- [ ] **Step 3: Extend `renderPrimitive`** — replace the `default:` branch and add `checkbox`/`radio`/`select` cases. Add `Checkbox` + `Select` imports at the top of `json-schema-form.tsx`:

```tsx
import {
  Checkbox,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@cisri/shadcn';
```

Replace the `default:` branch in `renderPrimitive` with these cases (keep the existing ones above):

```tsx
    case 'checkbox':
      return (
        <Checkbox
          id={id}
          checked={value === true}
          disabled={disabled}
          autoFocus={autoFocus}
          onCheckedChange={(c) => onChange(c === true)}
        />
      );
    case 'radio': {
      const options: unknown[] = schema.enum
        ? (schema.enum as unknown[])
        : [false, true];
      return (
        <div className="space-y-1">
          {options.map((opt) => (
            <label key={String(opt)} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name={id}
                checked={value === opt}
                disabled={disabled}
                onChange={() => onChange(opt)}
              />
              {schema.enum ? String(opt) : opt ? 'true' : 'false'}
            </label>
          ))}
        </div>
      );
    }
    case 'select': {
      const options = (schema.enum ?? []) as unknown[];
      return (
        <Select
          value={value != null ? String(value) : undefined}
          disabled={disabled}
          onValueChange={(v) => {
            const opt = options.find((o) => String(o) === v);
            onChange(opt);
          }}
        >
          <SelectTrigger id={id}>
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {options.map((opt) => (
              <SelectItem key={String(opt)} value={String(opt)}>
                {String(opt)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }
    default:
      return (
        <Input
          id={id}
          value={(value as string) ?? ''}
          placeholder={placeholder}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        />
      );
```

- [ ] **Step 4: Run test → pass**

Run: `CI=true pnpm --filter @cisri/json-schema-form test`
Expected: PASS — `Tests 8 passed` (5 + 3).

- [ ] **Step 5: Commit**

```bash
git add packages/json-schema-form/src/json-schema-form.tsx packages/json-schema-form/src/json-schema-form.test.tsx
git commit -m "feat(json-schema-form): boolean + enum widgets"
```

---

### Task 5: Object rendering with `ui:order` + nested controlled (TDD)

**Files:**
- Modify: `packages/json-schema-form/src/json-schema-form.test.tsx` (append tests)

(The FieldRenderer already handles objects in Task 3; this task verifies `ui:order` + nested updates.)

- [ ] **Step 1: Append tests**

```tsx
describe('JsonSchemaForm object', () => {
  it('renders nested object properties and updates by path', () => {
    const onChange = vi.fn();
    render(
      <JsonSchemaForm
        schema={{
          type: 'object',
          properties: {
            name: { type: 'string' },
            prefs: { type: 'object', properties: { theme: { type: 'string' } } },
          },
        }}
        value={{ name: '', prefs: { theme: '' } }}
        onChange={onChange}
      />
    );
    fireEvent.change(screen.getByLabelText('theme'), { target: { value: 'dark' } });
    expect(onChange.mock.calls.at(-1)?.[0]).toEqual({ name: '', prefs: { theme: 'dark' } });
  });

  it('respects ui:order for property rendering order', () => {
    render(
      <JsonSchemaForm
        schema={{ type: 'object', properties: { a: { type: 'string' }, b: { type: 'string' } } }}
        uiSchema={{ 'ui:order': ['b', 'a'] }}
        value={{ a: '', b: '' }}
        onChange={vi.fn()}
      />
    );
    const labels = screen.getAllByRole('textbox').map((el) => el.getAttribute('id'));
    expect(labels[0]).toContain('b');
    expect(labels[1]).toContain('a');
  });
});
```

- [ ] **Step 2: Run test → pass** (the object rendering already exists from Task 3)

Run: `CI=true pnpm --filter @cisri/json-schema-form test`
Expected: PASS — `Tests 10 passed` (8 + 2).

- [ ] **Step 3: Commit**

```bash
git add packages/json-schema-form/src/json-schema-form.test.tsx
git commit -m "test(json-schema-form): object ui:order + nested updates"
```

---

### Task 6: Array rendering — items + add/remove (TDD)

**Files:**
- Modify: `packages/json-schema-form/src/json-schema-form.test.tsx` (append tests)

(Array rendering exists from Task 3; this verifies add/remove.)

- [ ] **Step 1: Append tests**

```tsx
describe('JsonSchemaForm array', () => {
  it('renders array items and appends a new item', () => {
    const onChange = vi.fn();
    render(
      <JsonSchemaForm
        schema={{ type: 'array', items: { type: 'string' } }}
        value={['a']}
        onChange={onChange}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: '添加一项' }));
    expect(onChange.mock.calls.at(-1)?.[0]).toEqual(['a', undefined]);
  });

  it('removes an item via the × button', () => {
    const onChange = vi.fn();
    render(
      <JsonSchemaForm
        schema={{ type: 'array', items: { type: 'string' } }}
        value={['a', 'b']}
        onChange={onChange}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: '删除第 1 项' }));
    expect(onChange.mock.calls.at(-1)?.[0]).toEqual(['b']);
  });
});
```

- [ ] **Step 2: Run test → pass**

Run: `CI=true pnpm --filter @cisri/json-schema-form test`
Expected: PASS — `Tests 12 passed` (10 + 2).

- [ ] **Step 3: Commit**

```bash
git add packages/json-schema-form/src/json-schema-form.test.tsx
git commit -m "test(json-schema-form): array add/remove"
```

---

### Task 7: Remaining ui:* hints — help/hidden/disabled/readonly/classNames/autofocus (TDD)

**Files:**
- Modify: `packages/json-schema-form/src/json-schema-form.test.tsx` (append tests)

(label + placeholder covered in Task 3; this covers the rest, already applied in the FieldRenderer from Task 3.)

- [ ] **Step 1: Append tests**

```tsx
describe('JsonSchemaForm ui hints', () => {
  it('hides a field with ui:hidden', () => {
    render(
      <JsonSchemaForm
        schema={{ type: 'object', properties: { name: { type: 'string' }, secret: { type: 'string' } } }}
        uiSchema={{ secret: { 'ui:hidden': true } }}
        value={{ name: '', secret: '' }}
        onChange={vi.fn()}
      />
    );
    expect(screen.getByLabelText('name')).toBeInTheDocument();
    expect(screen.queryByLabelText('secret')).not.toBeInTheDocument();
  });

  it('renders ui:help text under the field', () => {
    render(
      <JsonSchemaForm
        schema={{ type: 'object', properties: { name: { type: 'string' } } }}
        uiSchema={{ name: { 'ui:help': 'Your full name' } }}
        value={{ name: '' }}
        onChange={vi.fn()}
      />
    );
    expect(screen.getByText('Your full name')).toBeInTheDocument();
  });

  it('disables a field with ui:disabled', () => {
    render(
      <JsonSchemaForm
        schema={{ type: 'object', properties: { name: { type: 'string' } } }}
        uiSchema={{ name: { 'ui:disabled': true } }}
        value={{ name: '' }}
        onChange={vi.fn()}
      />
    );
    expect(screen.getByLabelText('name')).toBeDisabled();
  });

  it('hides label when ui:label is false', () => {
    render(
      <JsonSchemaForm
        schema={{ type: 'object', properties: { name: { type: 'string' } } }}
        uiSchema={{ name: { 'ui:label': false } }}
        value={{ name: '' }}
        onChange={vi.fn()}
      />
    );
    expect(screen.queryByLabelText('name')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test → pass**

Run: `CI=true pnpm --filter @cisri/json-schema-form test`
Expected: PASS — `Tests 16 passed` (12 + 4).

- [ ] **Step 3: Commit**

```bash
git add packages/json-schema-form/src/json-schema-form.test.tsx
git commit -m "test(json-schema-form): ui:* hints coverage"
```

---

### Task 8: `renderFieldActions` hook (TDD)

**Files:**
- Modify: `packages/json-schema-form/src/json-schema-form.test.tsx` (append tests)

- [ ] **Step 1: Append test**

```tsx
describe('JsonSchemaForm renderFieldActions', () => {
  it('renders the action node beside each field with its path', () => {
    render(
      <JsonSchemaForm
        schema={{ type: 'object', properties: { name: { type: 'string' }, age: { type: 'integer' } } }}
        value={{ name: '', age: 0 }}
        onChange={vi.fn()}
        renderFieldActions={({ path }) => <button type="button" data-testid={`cfg-${path.join('.')}`}>cfg</button>}
      />
    );
    expect(screen.getByTestId('cfg-name')).toBeInTheDocument();
    expect(screen.getByTestId('cfg-age')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test → pass** (renderFieldActions already wired in the FieldRenderer from Task 3)

Run: `CI=true pnpm --filter @cisri/json-schema-form test`
Expected: PASS — `Tests 17 passed` (16 + 1).

- [ ] **Step 3: Commit**

```bash
git add packages/json-schema-form/src/json-schema-form.test.tsx
git commit -m "test(json-schema-form): renderFieldActions hook"
```

---

### Task 9: Validation onError + wire exports + docs demo + final verification

**Files:**
- Modify: `packages/json-schema-form/src/json-schema-form.tsx` (add `useEffect` for onError)
- Modify: `packages/json-schema-form/src/json-schema-form.test.tsx` (append validation test)
- Modify: `apps/docs/package.json` (add `@cisri/json-schema-form` dep) + `apps/docs/src/sections/DemoSection.tsx` (add demo block)
- Modify: `packages/json-schema-form/src/index.ts` (re-export types)

- [ ] **Step 1: Append validation test**

```tsx
import { useEffect } from 'react';
describe('JsonSchemaForm validation', () => {
  it('calls onError with required-field errors', () => {
    const onError = vi.fn();
    render(
      <JsonSchemaForm
        schema={{ type: 'object', properties: { name: { type: 'string' } }, required: ['name'] }}
        value={{}}
        onChange={vi.fn()}
        onError={onError}
      />
    );
    expect(onError.mock.calls.at(-1)?.[0]).toEqual(['name is required']);
  });

  it('calls onError with empty array when valid', () => {
    const onError = vi.fn();
    render(
      <JsonSchemaForm
        schema={{ type: 'object', properties: { name: { type: 'string' } }, required: ['name'] }}
        value={{ name: 'x' }}
        onChange={vi.fn()}
        onError={onError}
      />
    );
    expect(onError.mock.calls.at(-1)?.[0]).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test → fail**

Run: `CI=true pnpm --filter @cisri/json-schema-form test`
Expected: FAIL — `onError` not called (no validation wiring yet).

- [ ] **Step 3: Wire validation** — add to `json-schema-form.tsx`: import `useEffect` + `validateForm`, and in `JsonSchemaForm` call it:

Top of file, add to imports:
```tsx
import { useEffect } from 'react';
```
and
```tsx
import { validateForm } from './form-utils';
```

In the `JsonSchemaForm` function body, before the `return`, add:
```tsx
  useEffect(() => {
    onError?.(validateForm(schema, value));
  }, [schema, value, onError]);
```

- [ ] **Step 4: Run test → pass**

Run: `CI=true pnpm --filter @cisri/json-schema-form test`
Expected: PASS — `Tests 19 passed` (17 + 2).

- [ ] **Step 5: Finalize `src/index.ts`**

```ts
export { JsonSchemaForm } from './json-schema-form';
export type { JsonSchemaFormProps } from './json-schema-form';
export type { UiSchema, UiWidget } from '@cisri/json-schema-ui-core';
export type { JsonSchema } from '@cisri/json-schema-core';
```

- [ ] **Step 6: Build + full topo build**

Run: `CI=true pnpm --filter @cisri/json-schema-form build`
Expected: `tsc && vite build` succeeds; `dist/index.js` produced.

Run: `CI=true pnpm build`
Expected: exit 0; topo order shows `@cisri/json-schema-ui-core` before `@cisri/json-schema-form`.

- [ ] **Step 7: Add docs demo.** In `apps/docs/package.json` dependencies, add (alphabetically after `@cisri/db-schema-editor`):
```json
    "@cisri/json-schema-form": "workspace:*",
```

In `apps/docs/src/sections/DemoSection.tsx`, add an import + a demo block (after the db-schema-editor block, before the closing `</div>`):

```tsx
import { JsonSchemaForm } from '@cisri/json-schema-form';
```
and inside the component, add state + block:
```tsx
  const [formData, setFormData] = useState({ name: '', age: 0, active: false });
```
```tsx
      <div className="space-y-6">
        <h2 className="text-2xl font-bold tracking-tight">JSON Schema 表单</h2>
        <p className="text-muted-foreground">
          按 JSON Schema 渲染表单、编辑 JSON 数据。支持 uiSchema 提示（widget/label/placeholder/...）。
        </p>
        <div className="rounded-lg border border-border bg-card p-6">
          <JsonSchemaForm
            schema={{
              type: 'object',
              properties: {
                name: { type: 'string', title: 'Name' },
                age: { type: 'integer', title: 'Age' },
                active: { type: 'boolean', title: 'Active' },
              },
              required: ['name'],
            }}
            value={formData}
            onChange={setFormData}
            className="w-full"
          />
        </div>
        <pre className="max-h-96 overflow-auto rounded-md bg-muted p-4 text-xs">
          <code>{JSON.stringify(formData, null, 2)}</code>
        </pre>
      </div>
```

Run: `CI=true pnpm install --no-frozen-lockfile` (link the new docs dep)
Run: `CI=true pnpm --filter @cisri/docs build`
Expected: docs build exit 0 (the docs tailwind scans `packages/*/src/**` so form classes are picked up).

- [ ] **Step 8: Commit**

```bash
git add packages/json-schema-form/src/json-schema-form.tsx packages/json-schema-form/src/json-schema-form.test.tsx packages/json-schema-form/src/index.ts apps/docs/package.json apps/docs/src/sections/DemoSection.tsx pnpm-lock.yaml
git commit -m "feat(json-schema-form): validation onError + docs demo"
```

---

## Self-Review

**Spec coverage:** form Props (Task 3, 9) ✓; recursive renderer by type+widget (Task 3-4) ✓; object + ui:order (Task 5) ✓; array + add/remove (Task 6) ✓; ui:* hints (Task 3 label/placeholder, Task 7 help/hidden/disabled/readonly/classNames/autofocus, Task 4 ui:label false) ✓; controlled value/onChange (Task 3) ✓; validation required→onError (Task 9) ✓; renderFieldActions (Task 8) ✓; atoms from @cisri/shadcn incl. Label (Task 1) ✓; rename from json-editor (Task 1) ✓; docs demo (Task 9) ✓. (Enum select value-conversion + radio native input noted as v1 choices; full ajv validation + ui:options semantics + ui:field out of scope per spec.)

**Placeholder scan:** No TBD/TODO/“add error handling”/“similar to Task N”. Every code step shows full code; every run step shows exact command + expected result.

**Type consistency:** `JsonSchemaFormProps` defined in Task 1 (stub) + reused in Task 3 (full) with the same fields; `FieldRendererProps` consistent across Task 3; `renderPrimitive` signature consistent; `validateForm(schema, value): string[]` matches between Task 2 impl + Task 9 wiring; `UiSchema`/`UiWidget`/`generateDefaultUiSchema` from `@cisri/json-schema-ui-core` (merged). `renderFieldActions` ctx shape `{ path, uiSchema, schema }` matches the spec.

**Known v1 limitations (acceptable per spec):** enum `select` stringifies values then resolves back to the original enum option (works for string/number enums); `radio` uses native `<input type="radio">` (no Radio atom in @cisri/shadcn); `ui:options` is not yet consumed by widgets (passed through only as a no-op — can be wired per-widget later); array "add" appends `undefined` (the item renders empty).