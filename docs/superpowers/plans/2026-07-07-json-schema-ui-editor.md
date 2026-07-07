# json-schema-ui-editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `@cisri/json-schema-ui-editor` — a visual uiSchema editor that renders a live `JsonSchemaForm` preview and lets the user configure each field's `ui:*` properties inline (via a Popover per field), emitting an updated `uiSchema` via `onChange`. Object fields additionally support drag-to-reorder `ui:order`.

**Architecture:** Controlled component (`uiSchema` in / `onChange` out). Reuses `@cisri/json-schema-form` for the live preview, injecting a per-field "配置" Popover via the form's `renderFieldActions` hook. Each Popover opens a `FieldConfigPanel` (widget select, label + hide-label, help, placeholder, hidden/disabled/readonly switches, classNames; object fields get a dnd-kit `ui:order` drag list). Every change calls `onChange(setUiField(uiSchema, path, patch))` (immutable, from `@cisri/json-schema-ui-core`), so the form re-renders live. The editor edits only `uiSchema`, never `schema`.

**Tech Stack:** React 18, TypeScript, `@cisri/json-schema-form` (preview), `@cisri/json-schema-ui-core` (`setUiField`/`getUiField`/`generateDefaultUiSchema` + types), `@cisri/json-schema-core` (`JsonSchema`), `@cisri/shadcn` (Popover + Switch are NEW atoms added here; plus Select/Input/Label), `@dnd-kit/{core,sortable,modifiers,utilities}` (ui:order drag, same pattern as `@cisri/db-schema-editor`), lucide-react (`Settings2`, `GripVertical`), Vite lib build, Vitest + @testing-library/react.

**Spec:** [docs/superpowers/specs/2026-07-06-json-schema-form-ui-editor-design.md](../specs/2026-07-06-json-schema-form-ui-editor-design.md) — implements the `@cisri/json-schema-ui-editor` section (Phase 2, step 4) + the shadcn Popover/Switch atoms (Phase 2, step 3).

**Branch:** work on `feat/json-schema-ui-editor` (created in Task 1). Base = `master` (latest, after the form/ui-core merges + the docs commits). The plan touches three packages: `@cisri/shadcn` (new atoms), `@cisri/json-schema-form` (one additive hook widening), and the new `@cisri/json-schema-ui-editor`.

## Global Constraints

- Each `@cisri/*` business package is its own npm package; bottom-layer libs (Radix, cva, clsx, tailwind-merge, lucide-react, React, **dnd-kit**) are `peerDependencies`, never bundled (`rollupOptions.external` = peers + deps + `react/jsx-runtime`).
- `@cisri/shadcn` is the single home for shadcn atoms — business packages externalize it (no atom duplication).
- `pnpm 11.9`: install with `CI=true pnpm install --no-frozen-lockfile` (no-TTY); `allowBuilds: { esbuild: true }` is already set in `pnpm-workspace.yaml`. Peers auto-install (`auto-install-peers` default true) — so `@dnd-kit/*` + `lucide-react` need NOT be in `devDependencies` (mirror `@cisri/db-schema-editor`).
- `scripts/build-all.mjs` auto-discovers `packages/*` and topologically sorts by workspace `dependencies` — adding `json-schema-ui-editor` (deps on `json-schema-form`) requires NO change to `build-all.mjs`; it builds after `json-schema-form` automatically.
- Styling uses only shadcn CSS variables (`--popover`, `--primary`, `--input`, `--background`, `--ring`, `--border`, `--muted`, `--muted-foreground`, `--destructive`); no hardcoded colors or inline `style`.
- Test style: explicit `import { describe, it, expect, vi } from 'vitest'`; `vitest.config.ts` aliases `@cisri/*` to `src`; jsdom + the Radix pointer shim in `test/setup.ts` (setPointerCapture/scrollIntoView).
- Run tests/build with `CI=true pnpm --filter @cisri/<pkg> <cmd>`. Full topo build: `CI=true pnpm build`.
- Commit messages end with a blank line + `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

---

## File Structure

```
packages/json-schema-ui-editor/        # NEW package
├── package.json                        # @cisri/json-schema-ui-editor; deps core/json-schema-core/json-schema-ui-core/json-schema-form/shadcn; peers react/react-dom/lucide-react/@dnd-kit/*
├── vite.config.ts                      # name JsonSchemaUiEditor
├── tsconfig.json
├── vitest.config.ts                    # alias @cisri/core, @cisri/json-schema-core, @cisri/json-schema-ui-core, @cisri/json-schema-form, @cisri/shadcn → src
├── test/setup.ts                        # Radix pointer shim (same as form)
├── README.md
└── src/
    ├── index.ts                         # export JsonSchemaUiEditor + types (+ re-export UiSchema/UiWidget/JsonSchema)
    ├── json-schema-ui-editor.tsx        # main component: form preview + renderFieldActions → Popover → FieldConfigPanel
    ├── field-config-panel.tsx           # Popover content: all ui:* controls (+ OrderList for object, added Task 6)
    ├── ui-editor-utils.ts               # widgetsForSchema / isPrimitiveField / reorderOrder (pure)
    ├── ui-editor-utils.test.ts
    ├── field-config-panel.test.tsx
    └── json-schema-ui-editor.test.tsx

packages/shadcn/src/ui/popover.tsx       # NEW Popover atom
packages/shadcn/src/ui/switch.tsx        # NEW Switch atom
packages/shadcn/src/index.ts             # export popover + switch
packages/shadcn/package.json             # add @radix-ui/react-popover + @radix-ui/react-switch peers

packages/json-schema-form/src/json-schema-form.tsx  # MODIFIED: call renderFieldActions for object/array fieldsets (Task 2)
packages/json-schema-form/src/json-schema-form.test.tsx  # +1 test (Task 2)

apps/docs/package.json                   # +@cisri/json-schema-ui-editor, +@cisri/json-schema-ui-core, +@radix-ui/react-popover deps
apps/docs/src/sections/DemoSection.tsx   # +JsonSchemaUiEditor demo block
```

**Responsibilities:**
- `ui-editor-utils.ts` — pure helpers: which widgets apply to a schema type, whether a field is primitive, and array reorder. No React.
- `field-config-panel.tsx` — the Popover content UI (all `ui:*` controls + object `ui:order` drag list). Pure-ish: takes `schema` + `uiField` + `onPatch(patch)`, emits patches; the parent translates `patch` → `setUiField`.
- `json-schema-ui-editor.tsx` — the controlled editor: holds `openKey` (which field's popover is open) + a local `previewValue` (seeded from `formData`) so the form preview is interactive without affecting `uiSchema`; passes `renderFieldActions` that wraps each field in a Popover whose content is `FieldConfigPanel`.
- The form modification (Task 2) is the one integration widening: the spec designed `renderFieldActions` as "the only integration point" and expects it to fire for object fieldsets (for `ui:order`), but the merged form only fires it for primitives. Task 2 makes the object/array branches also call it — additive, opt-in (only fires when the prop is provided), and does not affect the form's 22 existing tests.

---

### Task 1: Scaffold `@cisri/json-schema-ui-editor` + add Popover/Switch atoms to `@cisri/shadcn`

**Files:**
- Create: `packages/json-schema-ui-editor/{package.json, vite.config.ts, tsconfig.json, vitest.config.ts, test/setup.ts, README.md, src/index.ts, src/json-schema-ui-editor.tsx}`
- Create: `packages/shadcn/src/ui/popover.tsx`, `packages/shadcn/src/ui/switch.tsx`
- Modify: `packages/shadcn/src/index.ts`, `packages/shadcn/package.json`

**Interfaces:**
- Produces: `@cisri/json-schema-ui-editor` package (stub component `JsonSchemaUiEditor` returning `null`, full `JsonSchemaUiEditorProps`); `@cisri/shadcn` gains `Popover`/`PopoverTrigger`/`PopoverContent`/`PopoverAnchor` + `Switch` exports.

- [ ] **Step 1: Create branch**

```bash
cd d:/30-Code/AI_Test/001-ui-components
git checkout -b feat/json-schema-ui-editor
```

- [ ] **Step 2: Create `packages/json-schema-ui-editor/package.json`** (full content):

```json
{
  "name": "@cisri/json-schema-ui-editor",
  "version": "1.0.0",
  "description": "Visual uiSchema editor for @cisri/json-schema-form (RJSF-style per-field UI config)",
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
    "@cisri/json-schema-form": "workspace:*",
    "@cisri/shadcn": "workspace:*"
  },
  "peerDependencies": {
    "react": "^18.0.0 || ^19.0.0",
    "react-dom": "^18.0.0 || ^19.0.0",
    "lucide-react": "^0.300.0",
    "@dnd-kit/core": "^6.0.0",
    "@dnd-kit/sortable": "^8.0.0",
    "@dnd-kit/modifiers": "^7.0.0",
    "@dnd-kit/utilities": "^3.2.0"
  },
  "peerDependenciesMeta": {
    "lucide-react": { "optional": false },
    "@dnd-kit/core": { "optional": false },
    "@dnd-kit/sortable": { "optional": false },
    "@dnd-kit/modifiers": { "optional": false },
    "@dnd-kit/utilities": { "optional": false }
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

- [ ] **Step 3: Create `vite.config.ts`**

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
      name: 'JsonSchemaUiEditor',
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

- [ ] **Step 4: Create `tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "composite": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "types": ["vitest/globals"]
  },
  "include": ["src/**/*"],
  "exclude": ["src/**/*.test.ts", "src/**/*.test.tsx"]
}
```

- [ ] **Step 5: Create `vitest.config.ts`** (alias all `@cisri/*` workspace deps to `src`):

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
      '@cisri/json-schema-form': path.resolve(__dirname, '../json-schema-form/src'),
      '@cisri/shadcn': path.resolve(__dirname, '../shadcn/src'),
    },
  },
});
```

- [ ] **Step 6: Create `test/setup.ts`** (Radix pointer shim — same as form's):

```ts
import '@testing-library/jest-dom/vitest';

// jsdom doesn't implement pointer capture methods used by Radix UI Select/Popover/Switch.
Element.prototype.setPointerCapture = () => {};
Element.prototype.releasePointerCapture = () => {};
Element.prototype.hasPointerCapture = () => false;
Element.prototype.scrollIntoView = () => {};
```

- [ ] **Step 7: Create `README.md`**

````markdown
# @cisri/json-schema-ui-editor

A visual uiSchema editor for `@cisri/json-schema-form`. Renders a live form preview and lets the user configure each field's `ui:*` properties inline (RJSF-style uiSchema). Emits the updated `uiSchema` via `onChange`; never modifies the `schema`.

> 与 `@cisri/json-schema-form`（编辑 JSON 数据）不同，本组件的输入是 schema + uiSchema，产出是 **uiSchema**。

## 安装

```bash
npm install @cisri/json-schema-ui-editor
```

## Peer Dependencies

```bash
npm install react react-dom lucide-react @dnd-kit/core @dnd-kit/sortable @dnd-kit/modifiers @dnd-kit/utilities
```

Radix/cva/clsx/tailwind-merge 由 `@cisri/shadcn` 与 `@cisri/core` 间接 peer（按其说明安装）。

## 使用

```tsx
import { useState } from 'react';
import { JsonSchemaUiEditor } from '@cisri/json-schema-ui-editor';
import { generateDefaultUiSchema } from '@cisri/json-schema-ui-core';

const schema = {
  type: 'object',
  properties: { name: { type: 'string', title: 'Name' }, age: { type: 'integer', title: 'Age' } },
};

export default function App() {
  const [uiSchema, setUiSchema] = useState(() => generateDefaultUiSchema(schema));
  return (
    <JsonSchemaUiEditor
      schema={schema}
      uiSchema={uiSchema}
      onChange={setUiSchema}
      formData={{ name: '', age: 0 }}
    />
  );
}
```

## 交互

每个字段右侧出现「配置」按钮，点击弹出面板：widget 下拉、label（含隐藏）、help、placeholder、hidden/disabled/readonly 开关、classNames。对象字段额外可拖曳调整字段顺序（`ui:order`）。改动实时反映在预览表单，并经 `onChange` 产出最新 `uiSchema`。

## Tailwind 配置

```ts
content: [
  './node_modules/@cisri/*/dist/**/*.{js,cjs}',
];
```

## CSS 变量

使用 shadcn/ui 标准 CSS 变量，可通过覆盖 `:root` 自定义主题。
````

- [ ] **Step 8: Create `src/index.ts` + stub `src/json-schema-ui-editor.tsx`**

`src/json-schema-ui-editor.tsx` (stub; real impl in Task 5):

```tsx
import type { JsonSchema } from '@cisri/json-schema-core';
import type { UiSchema } from '@cisri/json-schema-ui-core';

export interface JsonSchemaUiEditorProps {
  schema: JsonSchema;
  uiSchema: UiSchema;
  onChange: (uiSchema: UiSchema) => void;
  formData?: unknown;
  readOnly?: boolean;
  className?: string;
}

export function JsonSchemaUiEditor(_: JsonSchemaUiEditorProps) {
  return null;
}
```

`src/index.ts`:

```ts
export { JsonSchemaUiEditor } from './json-schema-ui-editor';
export type { JsonSchemaUiEditorProps } from './json-schema-ui-editor';
export type { UiSchema, UiWidget } from '@cisri/json-schema-ui-core';
export type { JsonSchema } from '@cisri/json-schema-core';
```

- [ ] **Step 9: Add `Popover` atom to `@cisri/shadcn`.** Create `packages/shadcn/src/ui/popover.tsx`:

```tsx
import * as React from 'react';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { cn } from '@cisri/core';

const Popover = PopoverPrimitive.Root;
const PopoverTrigger = PopoverPrimitive.Trigger;
const PopoverAnchor = PopoverPrimitive.Anchor;

const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, align = 'center', sideOffset = 4, ...props }, ref) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      className={cn(
        'z-50 w-72 rounded-md border border-border bg-popover p-4 text-popover-foreground shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
        className
      )}
      {...props}
    />
  </PopoverPrimitive.Portal>
));
PopoverContent.displayName = PopoverPrimitive.Content.displayName;

export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor };
```

- [ ] **Step 10: Add `Switch` atom to `@cisri/shadcn`.** Create `packages/shadcn/src/ui/switch.tsx`:

```tsx
import * as React from 'react';
import * as SwitchPrimitives from '@radix-ui/react-switch';
import { cn } from '@cisri/core';

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      'peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input',
      className
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        'pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0'
      )}
    />
  </SwitchPrimitives.Root>
));
Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch };
```

- [ ] **Step 11: Export the new atoms.** In `packages/shadcn/src/index.ts`, insert two lines so the final file is:

```ts
export * from './ui/button';
export * from './ui/checkbox';
export * from './ui/dialog';
export * from './ui/input';
export * from './ui/label';
export * from './ui/popover';
export * from './ui/scroll-area';
export * from './ui/select';
export * from './ui/separator';
export * from './ui/skeleton';
export * from './ui/switch';
export * from './ui/table';
export * from './ui/textarea';
```

- [ ] **Step 12: Add Radix peers to `@cisri/shadcn/package.json`.** In `peerDependencies`, add (alphabetical: `@radix-ui/react-popover` after `@radix-ui/react-label`, before `@radix-ui/react-scroll-area`; `@radix-ui/react-switch` after `@radix-ui/react-slot`):

```json
    "@radix-ui/react-popover": "^1.0.0",
    "@radix-ui/react-switch": "^1.0.0",
```

In `peerDependenciesMeta`, add (alphabetical — popover after label, switch after slot):

```json
    "@radix-ui/react-popover": { "optional": true },
    "@radix-ui/react-switch": { "optional": true },
```

- [ ] **Step 13: Install + build shadcn + build ui-editor (stub)**

Run: `CI=true pnpm install --no-frozen-lockfile`
Expected: succeeds; `@cisri/json-schema-ui-editor` added to lockfile; `@radix-ui/react-popover` + `@radix-ui/react-switch` auto-installed.

Run: `CI=true pnpm --filter @cisri/shadcn build`
Expected: `tsc && vite build` succeeds; `dist` now includes Popover + Switch.

Run: `CI=true pnpm --filter @cisri/json-schema-ui-editor build`
Expected: `tsc && vite build` succeeds (stub component returns null); `dist/index.js` + `dist/index.cjs` + `dist/index.d.ts` produced.

- [ ] **Step 14: Commit**

```bash
git add packages/json-schema-ui-editor packages/shadcn pnpm-lock.yaml
git commit -m "feat(json-schema-ui-editor): scaffold + Popover/Switch atoms

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: Widen `@cisri/json-schema-form` `renderFieldActions` to object/array fieldsets (TDD)

**Files:**
- Modify: `packages/json-schema-form/src/json-schema-form.tsx` (object + array FieldRenderer branches)
- Modify: `packages/json-schema-form/src/json-schema-form.test.tsx` (append one test)

**Interfaces:**
- Consumes: the merged `JsonSchemaForm` (master). Its `FieldRenderer` currently calls `renderFieldActions?.({ path, uiSchema, schema })` only in the primitive branch.
- Produces: the object and array fieldset branches ALSO call `renderFieldActions?.({ path, uiSchema, schema })` and render the returned node below the legend. This is what lets the ui-editor put a "配置" Popover on object fieldsets (for `ui:order`). Additive + opt-in: existing tests (no `renderFieldActions` prop) render nothing extra → no behavior change.

- [ ] **Step 1: Append failing test** to `packages/json-schema-form/src/json-schema-form.test.tsx`, inside the existing `describe('JsonSchemaForm renderFieldActions', ...)` block (add this `it` after the existing one):

```tsx
  it('renders renderFieldActions for an object fieldset with the object path', () => {
    render(
      <JsonSchemaForm
        schema={{
          type: 'object',
          properties: { prefs: { type: 'object', properties: { theme: { type: 'string' } } } },
        }}
        value={{ prefs: { theme: '' } }}
        onChange={vi.fn()}
        renderFieldActions={({ path }) => <span data-testid={`cfg-${path.join('.')}`}>cfg</span>}
      />
    );
    expect(screen.getByTestId('cfg-prefs')).toBeInTheDocument();
  });
```

- [ ] **Step 2: Run test → fail**

Run: `CI=true pnpm --filter @cisri/json-schema-form test`
Expected: FAIL — the object fieldset branch doesn't call `renderFieldActions`, so `getByTestId('cfg-prefs')` throws "not found". (The primitive `theme` would render `cfg-theme`, but `cfg-prefs` is absent.)

- [ ] **Step 3: Wire renderFieldActions into the object + array branches.** In `packages/json-schema-form/src/json-schema-form.tsx`, replace the OBJECT branch (the `if (schema.type === 'object' && schema.properties) { ... }` block) with:

```tsx
  // OBJECT
  if (schema.type === 'object' && schema.properties) {
    const order = (uiSchema?.['ui:order'] as string[] | undefined) ?? Object.keys(schema.properties);
    const requiredSet = new Set(schema.required ?? []);
    const obj = (value ?? {}) as Record<string, unknown>;
    const actions = renderFieldActions?.({ path, uiSchema, schema });
    return (
      <fieldset className={cn('space-y-3', classNames)}>
        {labelText && <legend className="text-sm font-medium">{labelText}</legend>}
        {actions && <div className="mt-1">{actions}</div>}
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
```

Replace the ARRAY branch (the `if (schema.type === 'array' && schema.items) { ... }` block) with:

```tsx
  // ARRAY
  if (schema.type === 'array' && schema.items) {
    const arr = Array.isArray(value) ? (value as unknown[]) : [];
    const itemUi = uiSchema?.items as UiSchema | undefined;
    const actions = renderFieldActions?.({ path, uiSchema, schema });
    return (
      <fieldset className={cn('space-y-2', classNames)}>
        {labelText && <legend className="text-sm font-medium">{labelText}</legend>}
        {actions && <div className="mt-1">{actions}</div>}
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
              <button
                type="button"
                onClick={() => onChange(arr.filter((_, j) => j !== i))}
                aria-label={`删除第 ${i + 1} 项`}
              >
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
```

(The only additions vs the merged code are the `const actions = renderFieldActions?.({ path, uiSchema, schema });` line and the `{actions && <div className="mt-1">{actions}</div>}` line in each branch — matching the primitive branch's existing pattern.)

- [ ] **Step 4: Run test → pass**

Run: `CI=true pnpm --filter @cisri/json-schema-form test`
Expected: PASS — `Tests 23 passed` (22 existing + 1 new). The existing tests don't pass `renderFieldActions`, so the new `{actions && ...}` renders nothing for them — no regressions.

- [ ] **Step 5: Build the form (tsc) to confirm no type errors**

Run: `CI=true pnpm --filter @cisri/json-schema-form build`
Expected: `tsc && vite build` succeeds.

- [ ] **Step 6: Commit**

```bash
git add packages/json-schema-form/src/json-schema-form.tsx packages/json-schema-form/src/json-schema-form.test.tsx
git commit -m "feat(json-schema-form): renderFieldActions for object/array fieldsets

Enables the ui-editor to attach a per-object config popover (for ui:order).
Additive: only fires when renderFieldActions is provided.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: Pure helpers — `widgetsForSchema` / `isPrimitiveField` / `reorderOrder` (TDD)

**Files:**
- Create: `packages/json-schema-ui-editor/src/ui-editor-utils.ts`
- Create: `packages/json-schema-ui-editor/src/ui-editor-utils.test.ts`

**Interfaces:**
- Produces (all pure, no React):
  - `isPrimitiveField(schema: JsonSchema): boolean` — true for string/number/integer/boolean and any enum field; false for object/array.
  - `widgetsForSchema(schema: JsonSchema): UiWidget[]` — widget options for the field type (`[]` for object/array; enum → `['select','radio','hidden']`; string → text/textarea/password/color/date/hidden; number/integer → updown/range/hidden; boolean → checkbox/radio/hidden).
  - `reorderOrder(order: string[], activeId: string, overId: string): string[]` — moves `activeId` to `overId`'s position immutably; returns input unchanged if either id is missing or they are equal.

- [ ] **Step 1: Write failing tests `src/ui-editor-utils.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { isPrimitiveField, widgetsForSchema, reorderOrder } from './ui-editor-utils';

describe('widgetsForSchema', () => {
  it('returns text/textarea/password/color/date/hidden for string', () => {
    expect(widgetsForSchema({ type: 'string' })).toEqual([
      'text', 'textarea', 'password', 'color', 'date', 'hidden',
    ]);
  });
  it('returns updown/range/hidden for integer and number', () => {
    expect(widgetsForSchema({ type: 'integer' })).toEqual(['updown', 'range', 'hidden']);
    expect(widgetsForSchema({ type: 'number' })).toEqual(['updown', 'range', 'hidden']);
  });
  it('returns checkbox/radio/hidden for boolean', () => {
    expect(widgetsForSchema({ type: 'boolean' })).toEqual(['checkbox', 'radio', 'hidden']);
  });
  it('returns select/radio/hidden for an enum field', () => {
    expect(widgetsForSchema({ type: 'string', enum: ['a', 'b'] })).toEqual([
      'select', 'radio', 'hidden',
    ]);
  });
  it('returns [] for object and array', () => {
    expect(widgetsForSchema({ type: 'object', properties: {} })).toEqual([]);
    expect(widgetsForSchema({ type: 'array', items: { type: 'string' } })).toEqual([]);
  });
});

describe('isPrimitiveField', () => {
  it('is true for string/number/integer/boolean and enum', () => {
    expect(isPrimitiveField({ type: 'string' })).toBe(true);
    expect(isPrimitiveField({ type: 'number' })).toBe(true);
    expect(isPrimitiveField({ type: 'integer' })).toBe(true);
    expect(isPrimitiveField({ type: 'boolean' })).toBe(true);
    expect(isPrimitiveField({ type: 'string', enum: ['a'] })).toBe(true);
  });
  it('is false for object and array', () => {
    expect(isPrimitiveField({ type: 'object', properties: {} })).toBe(false);
    expect(isPrimitiveField({ type: 'array', items: { type: 'string' } })).toBe(false);
  });
});

describe('reorderOrder', () => {
  it('moves the active item to the over position', () => {
    expect(reorderOrder(['a', 'b', 'c'], 'a', 'c')).toEqual(['b', 'c', 'a']);
    expect(reorderOrder(['a', 'b', 'c'], 'c', 'a')).toEqual(['c', 'a', 'b']);
  });
  it('returns the same order when active === over', () => {
    expect(reorderOrder(['a', 'b', 'c'], 'a', 'a')).toEqual(['a', 'b', 'c']);
  });
  it('returns the same order when an id is not found', () => {
    expect(reorderOrder(['a', 'b'], 'x', 'a')).toEqual(['a', 'b']);
    expect(reorderOrder(['a', 'b'], 'a', 'x')).toEqual(['a', 'b']);
  });
  it('does not mutate the input array', () => {
    const input = ['a', 'b', 'c'];
    reorderOrder(input, 'a', 'c');
    expect(input).toEqual(['a', 'b', 'c']);
  });
});
```

- [ ] **Step 2: Run test → fail**

Run: `CI=true pnpm --filter @cisri/json-schema-ui-editor test`
Expected: FAIL — module `./ui-editor-utils` not found (file not created yet).

- [ ] **Step 3: Implement `src/ui-editor-utils.ts`**

```ts
import type { JsonSchema } from '@cisri/json-schema-core';
import type { UiWidget } from '@cisri/json-schema-ui-core';

export function isPrimitiveField(schema: JsonSchema): boolean {
  if (schema.enum) return true;
  return (
    schema.type === 'string' ||
    schema.type === 'number' ||
    schema.type === 'integer' ||
    schema.type === 'boolean'
  );
}

export function widgetsForSchema(schema: JsonSchema): UiWidget[] {
  if (schema.enum) return ['select', 'radio', 'hidden'];
  switch (schema.type) {
    case 'string':
      return ['text', 'textarea', 'password', 'color', 'date', 'hidden'];
    case 'number':
    case 'integer':
      return ['updown', 'range', 'hidden'];
    case 'boolean':
      return ['checkbox', 'radio', 'hidden'];
    default:
      return [];
  }
}

export function reorderOrder(order: string[], activeId: string, overId: string): string[] {
  const from = order.indexOf(activeId);
  const to = order.indexOf(overId);
  if (from === -1 || to === -1 || from === to) return order;
  const next = [...order];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}
```

- [ ] **Step 4: Run test → pass**

Run: `CI=true pnpm --filter @cisri/json-schema-ui-editor test`
Expected: PASS — `Tests 11 passed` (5 + 2 + 4).

- [ ] **Step 5: Commit**

```bash
git add packages/json-schema-ui-editor/src/ui-editor-utils.ts packages/json-schema-ui-editor/src/ui-editor-utils.test.ts
git commit -m "feat(json-schema-ui-editor): widgetsForSchema/isPrimitiveField/reorderOrder helpers

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: `FieldConfigPanel` — Popover content with all controls except `ui:order` (TDD)

**Files:**
- Create: `packages/json-schema-ui-editor/src/field-config-panel.tsx`
- Create: `packages/json-schema-ui-editor/src/field-config-panel.test.tsx`

**Interfaces:**
- Consumes: `isPrimitiveField` + `widgetsForSchema` from `./ui-editor-utils` (Task 3); `UiSchema`/`UiWidget` types + `JsonSchema` type.
- Produces: `FieldConfigPanel({ schema, uiField, onPatch }: FieldConfigPanelProps)` where `FieldConfigPanelProps = { schema: JsonSchema; uiField: UiSchema | undefined; onPatch: (patch: Partial<UiSchema>) => void }`. Renders a `@cisri/shadcn` Select (widget, primitive only), Inputs (label/help/placeholder/classNames), and Switches (hide-label/hidden/disabled/readonly). Emits one `onPatch({ 'ui:<key>': value })` per control change. (The object `ui:order` drag list is added in Task 6.)

- [ ] **Step 1: Write failing tests `src/field-config-panel.test.tsx`**

```tsx
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FieldConfigPanel } from './field-config-panel';

describe('FieldConfigPanel primitive field', () => {
  it('renders the widget select for a string field', () => {
    render(
      <FieldConfigPanel schema={{ type: 'string' }} uiField={{ 'ui:widget': 'text' }} onPatch={vi.fn()} />
    );
    expect(screen.getByText('Widget')).toBeInTheDocument();
  });

  it('emits a widget patch when the widget select changes', async () => {
    const onPatch = vi.fn();
    const user = userEvent.setup();
    render(
      <FieldConfigPanel schema={{ type: 'string' }} uiField={{ 'ui:widget': 'text' }} onPatch={onPatch} />
    );
    await user.click(screen.getByRole('combobox', { name: 'widget' }));
    await user.click(screen.getByRole('option', { name: 'textarea' }));
    expect(onPatch.mock.calls.at(-1)?.[0]).toEqual({ 'ui:widget': 'textarea' });
  });

  it('emits a label patch when the label input changes', () => {
    const onPatch = vi.fn();
    render(<FieldConfigPanel schema={{ type: 'string' }} uiField={undefined} onPatch={onPatch} />);
    fireEvent.change(screen.getByLabelText('Label'), { target: { value: 'Full Name' } });
    expect(onPatch.mock.calls.at(-1)?.[0]).toEqual({ 'ui:label': 'Full Name' });
  });

  it('emits ui:label false when the hide-label switch is toggled on', () => {
    const onPatch = vi.fn();
    render(<FieldConfigPanel schema={{ type: 'string' }} uiField={undefined} onPatch={onPatch} />);
    fireEvent.click(screen.getByRole('switch', { name: '隐藏 label' }));
    expect(onPatch.mock.calls.at(-1)?.[0]).toEqual({ 'ui:label': false });
  });

  it('emits ui:hidden true when the hidden switch is toggled on', () => {
    const onPatch = vi.fn();
    render(<FieldConfigPanel schema={{ type: 'string' }} uiField={undefined} onPatch={onPatch} />);
    fireEvent.click(screen.getByRole('switch', { name: '隐藏字段' }));
    expect(onPatch.mock.calls.at(-1)?.[0]).toEqual({ 'ui:hidden': true });
  });

  it('emits a help patch and a classNames patch', () => {
    const onPatch = vi.fn();
    render(<FieldConfigPanel schema={{ type: 'string' }} uiField={undefined} onPatch={onPatch} />);
    fireEvent.change(screen.getByLabelText('Help'), { target: { value: 'Your name' } });
    expect(onPatch.mock.calls.at(-1)?.[0]).toEqual({ 'ui:help': 'Your name' });
    fireEvent.change(screen.getByLabelText('Class names'), { target: { value: 'extra' } });
    expect(onPatch.mock.calls.at(-1)?.[0]).toEqual({ 'ui:classNames': 'extra' });
  });

  it('emits ui:placeholder when the placeholder input changes (primitive only)', () => {
    const onPatch = vi.fn();
    render(<FieldConfigPanel schema={{ type: 'string' }} uiField={undefined} onPatch={onPatch} />);
    fireEvent.change(screen.getByLabelText('Placeholder'), { target: { value: 'type here' } });
    expect(onPatch.mock.calls.at(-1)?.[0]).toEqual({ 'ui:placeholder': 'type here' });
  });
});

describe('FieldConfigPanel object field', () => {
  it('does not render widget/placeholder/disabled/readonly for an object field', () => {
    render(
      <FieldConfigPanel
        schema={{ type: 'object', properties: { a: { type: 'string' }, b: { type: 'string' } } }}
        uiField={{ 'ui:order': ['a', 'b'] }}
        onPatch={vi.fn()}
      />
    );
    expect(screen.queryByText('Widget')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Placeholder')).not.toBeInTheDocument();
    expect(screen.queryByRole('switch', { name: '禁用' })).not.toBeInTheDocument();
    expect(screen.queryByRole('switch', { name: '只读' })).not.toBeInTheDocument();
    // common controls still present
    expect(screen.getByLabelText('Label')).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: '隐藏字段' })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test → fail**

Run: `CI=true pnpm --filter @cisri/json-schema-ui-editor test`
Expected: FAIL — module `./field-config-panel` not found.

- [ ] **Step 3: Implement `src/field-config-panel.tsx`** (full content — no `ui:order` yet; Task 6 adds it):

```tsx
import {
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
} from '@cisri/shadcn';
import type { JsonSchema } from '@cisri/json-schema-core';
import type { UiSchema, UiWidget } from '@cisri/json-schema-ui-core';
import { isPrimitiveField, widgetsForSchema } from './ui-editor-utils';

export interface FieldConfigPanelProps {
  schema: JsonSchema;
  uiField: UiSchema | undefined;
  onPatch: (patch: Partial<UiSchema>) => void;
}

export function FieldConfigPanel({ schema, uiField, onPatch }: FieldConfigPanelProps) {
  const primitive = isPrimitiveField(schema);
  const widgets = widgetsForSchema(schema);
  const labelValue = typeof uiField?.['ui:label'] === 'string' ? uiField['ui:label'] : '';
  const hideLabel = uiField?.['ui:label'] === false;

  return (
    <div className="space-y-3">
      {widgets.length > 0 && (
        <div className="space-y-1">
          <Label htmlFor="ui-cfg-widget">Widget</Label>
          <Select
            value={(uiField?.['ui:widget'] as UiWidget | undefined) ?? widgets[0]}
            onValueChange={(v) => onPatch({ 'ui:widget': v as UiWidget })}
          >
            <SelectTrigger id="ui-cfg-widget" aria-label="widget">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {widgets.map((w) => (
                <SelectItem key={w} value={w}>
                  {w}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="space-y-1">
        <Label htmlFor="ui-cfg-label">Label</Label>
        <Input
          id="ui-cfg-label"
          autoComplete="off"
          value={labelValue}
          onChange={(e) => onPatch({ 'ui:label': e.target.value || undefined })}
        />
      </div>
      <div className="flex items-center gap-2">
        <Switch
          id="ui-cfg-hide-label"
          aria-label="隐藏 label"
          checked={hideLabel}
          onCheckedChange={(c) => onPatch({ 'ui:label': c ? false : undefined })}
        />
        <Label htmlFor="ui-cfg-hide-label">隐藏 label</Label>
      </div>
      <div className="space-y-1">
        <Label htmlFor="ui-cfg-help">Help</Label>
        <Input
          id="ui-cfg-help"
          autoComplete="off"
          value={(uiField?.['ui:help'] as string | undefined) ?? ''}
          onChange={(e) => onPatch({ 'ui:help': e.target.value || undefined })}
        />
      </div>
      {primitive && (
        <div className="space-y-1">
          <Label htmlFor="ui-cfg-placeholder">Placeholder</Label>
          <Input
            id="ui-cfg-placeholder"
            autoComplete="off"
            value={(uiField?.['ui:placeholder'] as string | undefined) ?? ''}
            onChange={(e) => onPatch({ 'ui:placeholder': e.target.value || undefined })}
          />
        </div>
      )}
      <div className="flex items-center gap-2">
        <Switch
          id="ui-cfg-hidden"
          aria-label="隐藏字段"
          checked={uiField?.['ui:hidden'] === true}
          onCheckedChange={(c) => onPatch({ 'ui:hidden': c })}
        />
        <Label htmlFor="ui-cfg-hidden">隐藏字段</Label>
      </div>
      {primitive && (
        <div className="flex items-center gap-2">
          <Switch
            id="ui-cfg-disabled"
            aria-label="禁用"
            checked={uiField?.['ui:disabled'] === true}
            onCheckedChange={(c) => onPatch({ 'ui:disabled': c })}
          />
          <Label htmlFor="ui-cfg-disabled">禁用</Label>
        </div>
      )}
      {primitive && (
        <div className="flex items-center gap-2">
          <Switch
            id="ui-cfg-readonly"
            aria-label="只读"
            checked={uiField?.['ui:readonly'] === true}
            onCheckedChange={(c) => onPatch({ 'ui:readonly': c })}
          />
          <Label htmlFor="ui-cfg-readonly">只读</Label>
        </div>
      )}
      <div className="space-y-1">
        <Label htmlFor="ui-cfg-classnames">Class names</Label>
        <Input
          id="ui-cfg-classnames"
          autoComplete="off"
          value={(uiField?.['ui:classNames'] as string | undefined) ?? ''}
          onChange={(e) => onPatch({ 'ui:classNames': e.target.value || undefined })}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test → pass**

Run: `CI=true pnpm --filter @cisri/json-schema-ui-editor test`
Expected: PASS — `Tests 19 passed` (11 from Task 3 + 8 here).

- [ ] **Step 5: Commit**

```bash
git add packages/json-schema-ui-editor/src/field-config-panel.tsx packages/json-schema-ui-editor/src/field-config-panel.test.tsx
git commit -m "feat(json-schema-ui-editor): FieldConfigPanel (widget/label/help/placeholder/hidden/disabled/readonly/classNames)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: `JsonSchemaUiEditor` main — wire form preview + `renderFieldActions` + controlled Popover (TDD)

**Files:**
- Modify: `packages/json-schema-ui-editor/src/json-schema-ui-editor.tsx` (replace stub)
- Create: `packages/json-schema-ui-editor/src/json-schema-ui-editor.test.tsx`

**Interfaces:**
- Consumes: `JsonSchemaForm` from `@cisri/json-schema-form`; `setUiField` + `UiSchema` from `@cisri/json-schema-ui-core`; `JsonSchema` from `@cisri/json-schema-core`; `Popover`/`PopoverTrigger`/`PopoverContent` from `@cisri/shadcn`; `Settings2` from `lucide-react`; `FieldConfigPanel` from `./field-config-panel` (Task 4).
- Produces: the real `JsonSchemaUiEditor` controlled component (props per `JsonSchemaUiEditorProps`). Holds `openKey: string | null` (which field's Popover is open, keyed by `path.join('.')`) and a local `previewValue` seeded from `formData`. `renderFieldActions` returns a Popover wrapping a Settings2 button per field; Popover content = `FieldConfigPanel`; each panel patch → `onChange(setUiField(uiSchema, path, patch))`.

- [ ] **Step 1: Write failing tests `src/json-schema-ui-editor.test.tsx`**

```tsx
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
    expect(screen.getByLabelText('配置字段')).toBeInTheDocument(); // root object, path [] (aria-label "配置字段 " normalizes to "配置字段")
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
```

- [ ] **Step 2: Run test → fail**

Run: `CI=true pnpm --filter @cisri/json-schema-ui-editor test`
Expected: FAIL — the stub `JsonSchemaUiEditor` returns `null`, so `getByLabelText('Name')` throws "not found".

- [ ] **Step 3: Implement `src/json-schema-ui-editor.tsx`** (replace the stub with):

```tsx
import { useCallback, useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@cisri/shadcn';
import { Settings2 } from 'lucide-react';
import { cn } from '@cisri/core';
import { JsonSchemaForm } from '@cisri/json-schema-form';
import type { JsonSchema } from '@cisri/json-schema-core';
import { setUiField, type UiSchema } from '@cisri/json-schema-ui-core';
import { FieldConfigPanel } from './field-config-panel';

export interface JsonSchemaUiEditorProps {
  schema: JsonSchema;
  uiSchema: UiSchema;
  onChange: (uiSchema: UiSchema) => void;
  formData?: unknown;
  readOnly?: boolean;
  className?: string;
}

export function JsonSchemaUiEditor({
  schema,
  uiSchema,
  onChange,
  formData,
  readOnly,
  className,
}: JsonSchemaUiEditorProps) {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [previewValue, setPreviewValue] = useState<unknown>(formData);

  const handlePatch = useCallback(
    (path: string[], patch: Partial<UiSchema>) => {
      onChange(setUiField(uiSchema, path, patch));
    },
    [onChange, uiSchema]
  );

  const renderFieldActions = useCallback(
    (ctx: { path: string[]; uiSchema: UiSchema | undefined; schema: JsonSchema }) => {
      if (readOnly) return null;
      const key = ctx.path.join('.');
      return (
        <Popover
          open={openKey === key}
          onOpenChange={(o) =>
            o ? setOpenKey(key) : setOpenKey((cur) => (cur === key ? null : cur))
          }
        >
          <PopoverTrigger asChild>
            <button
              type="button"
              className="inline-flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-muted"
              aria-label={`配置字段 ${key}`}
            >
              <Settings2 className="h-4 w-4" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="start">
            <FieldConfigPanel
              schema={ctx.schema}
              uiField={ctx.uiSchema}
              onPatch={(patch) => handlePatch(ctx.path, patch)}
            />
          </PopoverContent>
        </Popover>
      );
    },
    [readOnly, openKey, handlePatch]
  );

  return (
    <div className={cn('space-y-3', className)}>
      <JsonSchemaForm
        schema={schema}
        uiSchema={uiSchema}
        value={previewValue}
        onChange={setPreviewValue}
        renderFieldActions={renderFieldActions}
      />
    </div>
  );
}
```

- [ ] **Step 4: Run test → pass**

Run: `CI=true pnpm --filter @cisri/json-schema-ui-editor test`
Expected: PASS — `Tests 23 passed` (19 + 4).

- [ ] **Step 5: Commit**

```bash
git add packages/json-schema-ui-editor/src/json-schema-ui-editor.tsx packages/json-schema-ui-editor/src/json-schema-ui-editor.test.tsx
git commit -m "feat(json-schema-ui-editor): live preview + per-field config Popover

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 6: `ui:order` dnd-kit drag list in the object panel (TDD)

**Files:**
- Modify: `packages/json-schema-ui-editor/src/field-config-panel.tsx` (add dnd-kit imports, `OrderList` + `SortableOrderItem` components, and render it for object fields)
- Modify: `packages/json-schema-ui-editor/src/field-config-panel.test.tsx` (append a smoke test)

**Interfaces:**
- Consumes: `reorderOrder` from `./ui-editor-utils` (Task 3); dnd-kit (`@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/modifiers`, `@dnd-kit/utilities`); `GripVertical` from `lucide-react`. Uses the same dnd-kit recipe as `@cisri/db-schema-editor` (PointerSensor distance:5 + KeyboardSensor, `restrictToVerticalAxis`, `verticalListSortingStrategy`, `closestCenter`).
- Produces: object-field panels now render an `OrderList` of the object's property names with drag handles; `onDragEnd` → `onPatch({ 'ui:order': reorderOrder(order, activeId, overId) })`.

- [ ] **Step 1: Append a smoke test** to `packages/json-schema-ui-editor/src/field-config-panel.test.tsx`:

```tsx
describe('FieldConfigPanel object ui:order drag', () => {
  it('renders a drag handle per property for an object field', () => {
    render(
      <FieldConfigPanel
        schema={{
          type: 'object',
          properties: { a: { type: 'string' }, b: { type: 'string' }, c: { type: 'string' } },
        }}
        uiField={{ 'ui:order': ['a', 'b', 'c'] }}
        onPatch={vi.fn()}
      />
    );
    expect(screen.getByLabelText('拖动字段 a')).toBeInTheDocument();
    expect(screen.getByLabelText('拖动字段 b')).toBeInTheDocument();
    expect(screen.getByLabelText('拖动字段 c')).toBeInTheDocument();
  });

  it('renders the 字段顺序 label for an object field', () => {
    render(
      <FieldConfigPanel
        schema={{ type: 'object', properties: { a: { type: 'string' } } }}
        uiField={{ 'ui:order': ['a'] }}
        onPatch={vi.fn()}
      />
    );
    expect(screen.getByText('字段顺序')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test → fail**

Run: `CI=true pnpm --filter @cisri/json-schema-ui-editor test`
Expected: FAIL — no `OrderList` yet, so `getByLabelText('拖动字段 a')` throws "not found" and `getByText('字段顺序')` throws.

- [ ] **Step 3: Add dnd-kit imports + OrderList + SortableOrderItem, and render it for objects.** In `packages/json-schema-ui-editor/src/field-config-panel.tsx`:

Add these imports at the top (after the existing imports):

```tsx
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { cn } from '@cisri/core';
import { reorderOrder } from './ui-editor-utils';
```

(`Label` is already imported from `@cisri/shadcn`; `cn` now imported here too — add it alongside the existing `@cisri/shadcn` import or as its own line. If `cn` would be a duplicate import, keep a single `import { cn } from '@cisri/core';` line.)

Add these two components ABOVE `FieldConfigPanel` (after the imports, before `export interface FieldConfigPanelProps`):

```tsx
interface SortableOrderItemProps {
  name: string;
}

function SortableOrderItem({ name }: SortableOrderItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: name });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'flex items-center gap-2 rounded border border-border px-2 py-1',
        isDragging && 'opacity-50'
      )}
    >
      <button
        type="button"
        className="flex h-6 w-6 cursor-grab items-center justify-center text-muted-foreground active:cursor-grabbing"
        aria-label={`拖动字段 ${name}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="pointer-events-none h-4 w-4" />
      </button>
      <span className="text-sm">{name}</span>
    </div>
  );
}

interface OrderListProps {
  order: string[];
  onReorder: (next: string[]) => void;
}

function OrderList({ order, onReorder }: OrderListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    onReorder(reorderOrder(order, String(active.id), String(over.id)));
  };
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis]}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={order} strategy={verticalListSortingStrategy}>
        <div className="space-y-1">
          {order.map((name) => (
            <SortableOrderItem key={name} name={name} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
```

In the `FieldConfigPanel` function body, add `const isOrderable = schema.type === 'object' && !!schema.properties;` near the top (next to `const primitive = ...`), and add this block as the LAST child inside the returned `<div className="space-y-3">` (after the Class names block):

```tsx
      {isOrderable && (
        <div className="space-y-1">
          <Label>字段顺序</Label>
          <OrderList
            order={(uiField?.['ui:order'] as string[] | undefined) ?? Object.keys(schema.properties!)}
            onReorder={(next) => onPatch({ 'ui:order': next })}
          />
        </div>
      )}
```

- [ ] **Step 4: Run test → pass**

Run: `CI=true pnpm --filter @cisri/json-schema-ui-editor test`
Expected: PASS — `Tests 25 passed` (23 + 2). (Drag itself is not exercised in jsdom — the `reorderOrder` logic is covered by Task 3 unit tests; here we smoke-test that the handles render, mirroring `@cisri/db-schema-editor`'s approach.)

- [ ] **Step 5: Build (tsc) to confirm the dnd-kit imports type-check**

Run: `CI=true pnpm --filter @cisri/json-schema-ui-editor build`
Expected: `tsc && vite build` succeeds; `dist/index.js` produced.

- [ ] **Step 6: Commit**

```bash
git add packages/json-schema-ui-editor/src/field-config-panel.tsx packages/json-schema-ui-editor/src/field-config-panel.test.tsx
git commit -m "feat(json-schema-ui-editor): ui:order dnd-kit drag list for object fields

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 7: Wire exports + full topo build + docs demo + final verification

**Files:**
- Modify: `packages/json-schema-ui-editor/src/index.ts` (already created in Task 1; verify/finalize)
- Modify: `apps/docs/package.json` (add `@cisri/json-schema-ui-editor`, `@cisri/json-schema-ui-core`, `@radix-ui/react-popover`)
- Modify: `apps/docs/src/sections/DemoSection.tsx` (add the ui-editor demo block)

**Interfaces:**
- Produces: the published surface `export { JsonSchemaUiEditor }` + `export type { JsonSchemaUiEditorProps, UiSchema, UiWidget, JsonSchema }`; a docs demo exercising the editor on a 4-field object schema (string/integer/enum/boolean) with the produced `uiSchema` shown as JSON.

- [ ] **Step 1: Finalize `packages/json-schema-ui-editor/src/index.ts`** (it was created in Task 1; confirm it matches — no change expected):

```ts
export { JsonSchemaUiEditor } from './json-schema-ui-editor';
export type { JsonSchemaUiEditorProps } from './json-schema-ui-editor';
export type { UiSchema, UiWidget } from '@cisri/json-schema-ui-core';
export type { JsonSchema } from '@cisri/json-schema-core';
```

- [ ] **Step 2: Build the ui-editor package**

Run: `CI=true pnpm --filter @cisri/json-schema-ui-editor build`
Expected: `tsc && vite build` succeeds; `dist/index.js`, `dist/index.cjs`, `dist/index.d.ts` produced.

- [ ] **Step 3: Full topo build** (confirms `json-schema-ui-editor` builds after `json-schema-form`, and shadcn's new atoms build before it)

Run: `CI=true pnpm build`
Expected: exit 0; topo order shows `@cisri/json-schema-form` (and `@cisri/shadcn`) before `@cisri/json-schema-ui-editor`; ends with `=== All packages built ===` (now 10 packages: core, db-schema-core, shadcn, db-schema-editor, json-schema-core, json-schema-editor, json-schema-ui-core, json-schema-form, json-schema-selector, json-schema-ui-editor).

- [ ] **Step 4: Add docs deps.** In `apps/docs/package.json` `dependencies`, add (keep the block valid JSON; place alphabetically among the `@cisri/*` entries):

```json
    "@cisri/json-schema-ui-core": "workspace:*",
    "@cisri/json-schema-ui-editor": "workspace:*",
```

And add the Radix peer for the new Popover atom (alphabetical: after `@radix-ui/react-label`, before `@radix-ui/react-select`):

```json
    "@radix-ui/react-popover": "^1.0.0",
```

(`@radix-ui/react-switch` is already in docs deps. `@dnd-kit/*` resolves via pnpm `auto-install-peers` — same as the existing `@cisri/db-schema-editor` demo, which uses dnd-kit without docs declaring it — so do NOT add `@dnd-kit/*` to docs.)

- [ ] **Step 5: Add the docs demo.** In `apps/docs/src/sections/DemoSection.tsx`, add imports at the top (with the others):

```tsx
import { JsonSchemaUiEditor } from '@cisri/json-schema-ui-editor';
import { generateDefaultUiSchema } from '@cisri/json-schema-ui-core';
```

Add a schema constant near the other constants (e.g. after `initialTable`):

```tsx
const uiEditorSchema: JsonSchema = {
  type: 'object' as const,
  title: 'User',
  properties: {
    name: { type: 'string' as const, title: 'Name' },
    age: { type: 'integer' as const, title: 'Age' },
    role: { type: 'string' as const, title: 'Role', enum: ['admin', 'user', 'guest'] },
    active: { type: 'boolean' as const, title: 'Active' },
  },
  required: ['name'],
};
```

Inside `DemoSection`, add state alongside the other `useState` calls:

```tsx
  const [uiSchema, setUiSchema] = useState(() => generateDefaultUiSchema(uiEditorSchema));
```

Add a new demo block as the LAST child of the returned `<div className="space-y-10">` (after the JSON Schema 表单 block, before the closing `</div>`):

```tsx
      <div className="space-y-6">
        <h2 className="text-2xl font-bold tracking-tight">JSON Schema UI 编辑器</h2>
        <p className="text-muted-foreground">
          在默认生成的表单上逐字段配置 UI（widget/label/help/placeholder/hidden/disabled/readonly/classNames），对象字段可拖曳调整顺序。产出 uiSchema。
        </p>

        <div className="rounded-lg border border-border bg-card p-6">
          <JsonSchemaUiEditor
            schema={uiEditorSchema}
            uiSchema={uiSchema}
            onChange={setUiSchema}
            formData={{ name: '', age: 0, role: 'user', active: false }}
            className="w-full"
          />
        </div>

        <div className="space-y-2">
          <h3 className="font-semibold">当前 uiSchema</h3>
          <pre className="max-h-96 overflow-auto rounded-md bg-muted p-4 text-xs">
            <code>{JSON.stringify(uiSchema, null, 2)}</code>
          </pre>
        </div>
      </div>
```

- [ ] **Step 6: Install + build docs**

Run: `CI=true pnpm install --no-frozen-lockfile`
Expected: succeeds; links the new docs deps.

Run: `CI=true pnpm --filter @cisri/docs build`
Expected: docs build exit 0 (the docs tailwind scans `packages/*/src/**` so the editor + Popover/Switch classes are picked up).

- [ ] **Step 7: Commit**

```bash
git add apps/docs/package.json apps/docs/src/sections/DemoSection.tsx pnpm-lock.yaml
git commit -m "docs: add json-schema-ui-editor demo

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

- [ ] **Step 8: Final verification (whole repo)**

Run: `CI=true pnpm --filter @cisri/json-schema-ui-editor test`
Expected: PASS — `Tests 25 passed`.

Run: `CI=true pnpm build`
Expected: exit 0; all 10 packages built in topo order.

Run: `CI=true pnpm --filter @cisri/docs build`
Expected: exit 0.

(Then complete the branch via superpowers:finishing-a-development-branch — verify tests, present options, merge to master, delete branch.)

---

## Self-Review

**Spec coverage:** ui-editor Props `schema`/`uiSchema`/`onChange`/`formData`/`readOnly`/`className` (Task 1 + Task 5) ✓; live preview via `JsonSchemaForm` (Task 5) ✓; per-field inline "配置" button via `renderFieldActions` (Task 5, requiring the Task 2 form widening for object fieldsets) ✓; Popover panel with `ui:widget` dropdown by field type (Task 4, options from `widgetsForSchema` Task 3) ✓; `ui:label` input + "hide label" (Task 4) ✓; `ui:help`/`ui:placeholder` inputs (Task 4) ✓; `ui:hidden`/`ui:disabled`/`ui:readonly` switches (Task 4) ✓; `ui:classNames` input (Task 4) ✓; object `ui:order` dnd-kit drag (Task 6, `reorderOrder` from Task 3) ✓; `onChange(setUiField(...))` immutable update (Task 5) ✓; only edits uiSchema, never schema (Task 5) ✓; Popover + Switch atoms added to `@cisri/shadcn` with Radix peers (Task 1) ✓; reuses form + ui-core, no atom duplication (externalizes `@cisri/shadcn`) (Task 1) ✓; docs demo (Task 7) ✓; `ui:autofocus` and `ui:options` deliberately NOT exposed in the panel (out of scope per spec "未纳入 v1") ✓.

**Placeholder scan:** No TBD/TODO/"implement later"/"add error handling"/"similar to Task N". Every code step shows full code; every run step shows the exact command + expected result. Task 6 shows the exact imports, the exact two new components, and the exact block to insert (with surrounding context). Task 2 shows the full replacement code for both branches.

**Type consistency:** `JsonSchemaUiEditorProps` defined in Task 1 (stub) and Task 5 (real) with identical fields. `FieldConfigPanelProps = { schema: JsonSchema; uiField: UiSchema | undefined; onPatch: (patch: Partial<UiSchema>) => void }` — consistent between Task 4 (definition) and Task 5 (usage: `onPatch={(patch) => handlePatch(ctx.path, patch)}`). `handlePatch(path: string[], patch: Partial<UiSchema>)` → `onChange(setUiField(uiSchema, path, patch))` matches `setUiField(uiSchema: UiSchema, path: string[], patch: Partial<UiSchema>): UiSchema` from `@cisri/json-schema-ui-core`. `renderFieldActions` ctx shape `{ path, uiSchema, schema }` matches the form's prop type (and the Task 2 widening calls it with the same shape). `widgetsForSchema`/`isPrimitiveField`/`reorderOrder` signatures match between Task 3 (impl) and Tasks 4/6 (usage). `OrderList`/`SortableOrderItem` props consistent. The form's `renderFieldActions` return type is `React.ReactNode`; the ui-editor returns `Popover | null` (a `ReactNode`) — assignable.

**Known v1 limitations (acceptable per spec):** (1) `previewValue` is seeded from `formData` once on mount and not re-synced if `formData` changes later — the preview is interactive via local state, but external `formData` updates after mount are ignored (v1; the spec calls `formData` "可选预览数据"). (2) The `ui:order` drag is jsdom-untestable as a real pointer drag; `reorderOrder` is unit-tested in Task 3 and the handles are smoke-tested in Task 6 (same approach as `@cisri/db-schema-editor`). (3) Clearing a text control emits `undefined` for that `ui:*` key; `setUiField` keeps the key as `undefined` (harmless — the form reads `undefined` as "not set", and `JSON.stringify` omits undefined). (4) `ui:autofocus` and `ui:options` are not exposed in the panel (out of v1 scope per spec).