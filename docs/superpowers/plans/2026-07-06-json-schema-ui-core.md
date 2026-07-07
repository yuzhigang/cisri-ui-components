# json-schema-ui-core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `@cisri/json-schema-ui-core`, a pure types+utils package providing the RJSF-style `UiSchema`/`UiWidget` model and three helpers (`generateDefaultUiSchema`, `getUiField`, `setUiField`) shared by `@cisri/json-schema-form` and `@cisri/json-schema-ui-editor`.

**Architecture:** New workspace package `packages/json-schema-ui-core/`, mirroring the existing `@cisri/json-schema-core` / `@cisri/db-schema-core` pattern — pure TS, no peerDependencies, `tsc && vite build`, vitest with explicit imports. Types in `src/types.ts`, helpers in `src/utils.ts`, re-exported via `src/index.ts`. Depends on `@cisri/json-schema-core` (type-only, declared in `dependencies` so consumers resolve `.d.ts`).

**Tech Stack:** TypeScript, Vite (lib build), Vitest, `@cisri/json-schema-core` (for the `JsonSchema` type).

**Spec:** [docs/superpowers/specs/2026-07-06-json-schema-form-ui-editor-design.md](../specs/2026-07-06-json-schema-form-ui-editor-design.md) — implements the `@cisri/json-schema-ui-core` section (Phase 1, step 1).

---

## File Structure

```
packages/json-schema-ui-core/
├── package.json            # @cisri/json-schema-ui-core; dep @cisri/json-schema-core; devDeps ts/vite/vitest
├── vite.config.ts          # lib build (es+cjs), externalize deps
├── tsconfig.json           # extends base, composite, outDir dist, rootDir src, exclude *.test.ts
├── src/
│   ├── index.ts            # re-export types + utils
│   ├── types.ts            # UiWidget, UiSchema
│   ├── utils.ts            # generateDefaultUiSchema, getUiField, setUiField
│   └── utils.test.ts       # unit tests
```

No `vitest.config.ts` (matches `db-schema-core`: utils only type-import `@cisri/json-schema-core`, which esbuild strips — no alias needed). No README (matches `json-schema-core`/`db-schema-core`).

---

### Task 1: Scaffold the package

**Files:**
- Create: `packages/json-schema-ui-core/package.json`
- Create: `packages/json-schema-ui-core/vite.config.ts`
- Create: `packages/json-schema-ui-core/tsconfig.json`
- Create: `packages/json-schema-ui-core/src/index.ts`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "@cisri/json-schema-ui-core",
  "version": "1.0.0",
  "description": "Shared uiSchema types and utilities for @cisri business components",
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
    "prepublishOnly": "pnpm build",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "publishConfig": {
    "access": "public"
  },
  "dependencies": {
    "@cisri/json-schema-core": "workspace:*"
  },
  "devDependencies": {
    "typescript": "^5.4.5",
    "vite": "^5.2.11",
    "vitest": "^1.6.0"
  }
}
```

- [ ] **Step 2: Create `vite.config.ts`**

```ts
import { defineConfig } from 'vite';
import pkg from './package.json' with { type: 'json' };

const { peerDependencies, dependencies } = pkg;

export default defineConfig({
  build: {
    emptyOutDir: false,
    lib: {
      entry: './src/index.ts',
      name: 'JsonSchemaUiCore',
      formats: ['es', 'cjs'],
      fileName: (format) => `index.${format === 'es' ? 'js' : 'cjs'}`,
    },
    rollupOptions: {
      external: [
        ...Object.keys(peerDependencies ?? {}),
        ...Object.keys(dependencies ?? {}),
        'react/jsx-runtime',
      ],
    },
  },
});
```

- [ ] **Step 3: Create `tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "composite": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["dist", "node_modules", "**/*.test.ts"]
}
```

- [ ] **Step 4: Create empty `src/index.ts`**

```ts
export {};
```

- [ ] **Step 5: Register the package and build**

Run: `CI=true pnpm install --no-frozen-lockfile`
Expected: `Scope: all 11 workspace projects` (was 10), `Done in <Ns>`; the new `@cisri/json-schema-ui-core` is linked and `@cisri/json-schema-core` is available to it.

Run: `CI=true pnpm --filter @cisri/json-schema-ui-core build`
Expected: `tsc && vite build` succeeds; `dist/index.js`, `dist/index.cjs`, `dist/index.d.ts` produced (near-empty).

- [ ] **Step 6: Commit**

```bash
git add packages/json-schema-ui-core/package.json packages/json-schema-ui-core/vite.config.ts packages/json-schema-ui-core/tsconfig.json packages/json-schema-ui-core/src/index.ts pnpm-lock.yaml
git commit -m "feat(json-schema-ui-core): scaffold package"
```

---

### Task 2: Define `UiSchema` and `UiWidget` types

**Files:**
- Create: `packages/json-schema-ui-core/src/types.ts`

- [ ] **Step 1: Create `src/types.ts`**

```ts
/**
 * 表单 widget 标识（RJSF 核心子集）。
 */
export type UiWidget =
  | 'text'
  | 'textarea'
  | 'password'
  | 'color'
  | 'date'
  | 'updown'
  | 'range'
  | 'checkbox'
  | 'radio'
  | 'select'
  | 'hidden';

/**
 * uiSchema：与 JsonSchema 并行的 UI 提示（RJSF 风格 ui:* 键）。
 * 嵌套：object 各 property 名 → UiSchema；array 的 'items' → UiSchema。
 */
export interface UiSchema {
  'ui:widget'?: UiWidget;
  'ui:options'?: Record<string, unknown>;
  'ui:label'?: string | false;
  'ui:help'?: string;
  'ui:placeholder'?: string;
  'ui:order'?: string[];
  'ui:hidden'?: boolean;
  'ui:disabled'?: boolean;
  'ui:readonly'?: boolean;
  'ui:classNames'?: string;
  'ui:autofocus'?: boolean;
  [property: string]: unknown;
}
```

- [ ] **Step 2: Verify build type-checks**

Run: `CI=true pnpm --filter @cisri/json-schema-ui-core build`
Expected: succeeds; `tsc` compiles `types.ts` (declarations only).

- [ ] **Step 3: Commit**

```bash
git add packages/json-schema-ui-core/src/types.ts
git commit -m "feat(json-schema-ui-core): add UiSchema and UiWidget types"
```

---

### Task 3: Implement `generateDefaultUiSchema` (TDD)

**Files:**
- Create: `packages/json-schema-ui-core/src/utils.ts`
- Create: `packages/json-schema-ui-core/src/utils.test.ts`

- [ ] **Step 1: Write the failing test (`src/utils.test.ts`)**

```ts
import { describe, expect, it } from 'vitest';
import { generateDefaultUiSchema } from './utils';

describe('generateDefaultUiSchema', () => {
  it('picks widget by primitive type', () => {
    expect(generateDefaultUiSchema({ type: 'string' })).toEqual({ 'ui:widget': 'text' });
    expect(generateDefaultUiSchema({ type: 'number' })).toEqual({ 'ui:widget': 'updown' });
    expect(generateDefaultUiSchema({ type: 'integer' })).toEqual({ 'ui:widget': 'updown' });
    expect(generateDefaultUiSchema({ type: 'boolean' })).toEqual({ 'ui:widget': 'checkbox' });
  });

  it('picks select for enum', () => {
    expect(generateDefaultUiSchema({ type: 'string', enum: ['a', 'b'] })).toEqual({
      'ui:widget': 'select',
    });
  });

  it('nests object properties with ui:order', () => {
    const ui = generateDefaultUiSchema({
      type: 'object',
      properties: { name: { type: 'string' }, age: { type: 'integer' } },
    });
    expect(ui['ui:order']).toEqual(['name', 'age']);
    expect(ui.name).toEqual({ 'ui:widget': 'text' });
    expect(ui.age).toEqual({ 'ui:widget': 'updown' });
  });

  it('nests array items', () => {
    const ui = generateDefaultUiSchema({ type: 'array', items: { type: 'string' } });
    expect(ui.items).toEqual({ 'ui:widget': 'text' });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `CI=true pnpm --filter @cisri/json-schema-ui-core test`
Expected: FAIL — `Failed to resolve import "./utils"` (file does not exist yet).

- [ ] **Step 3: Implement `src/utils.ts`**

```ts
import type { JsonSchema } from '@cisri/json-schema-core';
import type { UiSchema, UiWidget } from './types';

function defaultWidgetForSchema(schema: JsonSchema): UiWidget {
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

export function generateDefaultUiSchema(schema: JsonSchema): UiSchema {
  const ui: UiSchema = {};
  if (schema.type === 'object' && schema.properties) {
    const order = Object.keys(schema.properties);
    if (order.length > 0) ui['ui:order'] = order;
    for (const [name, child] of Object.entries(schema.properties)) {
      ui[name] = generateDefaultUiSchema(child);
    }
  } else if (schema.type === 'array' && schema.items) {
    ui.items = generateDefaultUiSchema(schema.items);
  } else {
    ui['ui:widget'] = defaultWidgetForSchema(schema);
  }
  return ui;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `CI=true pnpm --filter @cisri/json-schema-ui-core test`
Expected: PASS — `Test Files 1 passed`, `Tests 4 passed`.

- [ ] **Step 5: Commit**

```bash
git add packages/json-schema-ui-core/src/utils.ts packages/json-schema-ui-core/src/utils.test.ts
git commit -m "feat(json-schema-ui-core): generateDefaultUiSchema"
```

---

### Task 4: Implement `getUiField` (TDD)

**Files:**
- Modify: `packages/json-schema-ui-core/src/utils.ts` (append `getUiField`)
- Modify: `packages/json-schema-ui-core/src/utils.test.ts` (extend import + append describe)

- [ ] **Step 1: Update the test import and append the `getUiField` describe**

In `src/utils.test.ts`, change the import line to:

```ts
import { generateDefaultUiSchema, getUiField } from './utils';
```

Append:

```ts
describe('getUiField', () => {
  const ui = generateDefaultUiSchema({
    type: 'object',
    properties: {
      name: { type: 'string' },
      prefs: { type: 'object', properties: { theme: { type: 'string' } } },
    },
  });

  it('returns nested node by path', () => {
    expect(getUiField(ui, ['name'])).toEqual({ 'ui:widget': 'text' });
    expect(getUiField(ui, ['prefs', 'theme'])).toEqual({ 'ui:widget': 'text' });
  });

  it('returns undefined for missing path', () => {
    expect(getUiField(ui, ['missing'])).toBeUndefined();
    expect(getUiField(undefined, ['name'])).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `CI=true pnpm --filter @cisri/json-schema-ui-core test`
Expected: FAIL — `getUiField is not exported from "./utils"`.

- [ ] **Step 3: Append `getUiField` to `src/utils.ts`**

```ts
export function getUiField(
  uiSchema: UiSchema | undefined,
  path: string[]
): UiSchema | undefined {
  let node: UiSchema | undefined = uiSchema;
  for (const segment of path) {
    if (node == null || typeof node !== 'object') return undefined;
    node = node[segment] as UiSchema | undefined;
  }
  return node;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `CI=true pnpm --filter @cisri/json-schema-ui-core test`
Expected: PASS — `Tests 6 passed` (4 + 2).

- [ ] **Step 5: Commit**

```bash
git add packages/json-schema-ui-core/src/utils.ts packages/json-schema-ui-core/src/utils.test.ts
git commit -m "feat(json-schema-ui-core): getUiField"
```

---

### Task 5: Implement `setUiField` (TDD)

**Files:**
- Modify: `packages/json-schema-ui-core/src/utils.ts` (append `setUiField`)
- Modify: `packages/json-schema-ui-core/src/utils.test.ts` (extend import + append describe)

- [ ] **Step 1: Update the test import and append the `setUiField` describe**

In `src/utils.test.ts`, change the import line to:

```ts
import { generateDefaultUiSchema, getUiField, setUiField } from './utils';
```

Append:

```ts
describe('setUiField', () => {
  it('merges at root when path is empty', () => {
    const ui = { 'ui:widget': 'text' as const };
    expect(setUiField(ui, [], { 'ui:label': 'Name' })).toEqual({
      'ui:widget': 'text',
      'ui:label': 'Name',
    });
  });

  it('sets a nested node immutably (original unchanged)', () => {
    const ui = generateDefaultUiSchema({
      type: 'object',
      properties: { name: { type: 'string' } },
    });
    const next = setUiField(ui, ['name'], { 'ui:widget': 'textarea' });
    expect((next.name as { 'ui:widget': string })['ui:widget']).toBe('textarea');
    expect((ui.name as { 'ui:widget': string })['ui:widget']).toBe('text');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `CI=true pnpm --filter @cisri/json-schema-ui-core test`
Expected: FAIL — `setUiField is not exported from "./utils"`.

- [ ] **Step 3: Append `setUiField` to `src/utils.ts`**

```ts
export function setUiField(
  uiSchema: UiSchema,
  path: string[],
  patch: Partial<UiSchema>
): UiSchema {
  if (path.length === 0) return { ...uiSchema, ...patch };
  const [head, ...rest] = path;
  const child = (uiSchema[head] as UiSchema | undefined) ?? {};
  return { ...uiSchema, [head]: setUiField(child, rest, patch) };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `CI=true pnpm --filter @cisri/json-schema-ui-core test`
Expected: PASS — `Tests 8 passed` (6 + 2).

- [ ] **Step 5: Commit**

```bash
git add packages/json-schema-ui-core/src/utils.ts packages/json-schema-ui-core/src/utils.test.ts
git commit -m "feat(json-schema-ui-core): setUiField"
```

---

### Task 6: Wire public exports and final verification

**Files:**
- Modify: `packages/json-schema-ui-core/src/index.ts`

- [ ] **Step 1: Replace `src/index.ts` with the real exports**

```ts
export type { UiWidget, UiSchema } from './types';
export { generateDefaultUiSchema, getUiField, setUiField } from './utils';
```

- [ ] **Step 2: Build and test together**

Run: `CI=true pnpm --filter @cisri/json-schema-ui-core build`
Expected: `tsc && vite build` succeeds; `dist/index.js` re-exports the three helpers, `dist/index.d.ts` re-exports `UiWidget`/`UiSchema` + the helpers.

Run: `CI=true pnpm --filter @cisri/json-schema-ui-core test`
Expected: PASS — `Test Files 1 passed`, `Tests 8 passed`.

- [ ] **Step 3: Verify it composes with a downstream build (topo order)**

Run: `CI=true pnpm build`
Expected: exit 0; build order shows `@cisri/json-schema-core` before `@cisri/json-schema-ui-core` (topo sort via `build-all.mjs`).

- [ ] **Step 4: Commit**

```bash
git add packages/json-schema-ui-core/src/index.ts
git commit -m "feat(json-schema-ui-core): wire public exports"
```

---

## Self-Review

**Spec coverage:** The spec's `@cisri/json-schema-ui-core` section defines `UiSchema`/`UiWidget` (Task 2), `generateDefaultUiSchema` (Task 3), `getUiField` (Task 4), `setUiField` (Task 5), exports (Task 6), package structure (Task 1). All covered. (The form + ui-editor are Plans 2 + 3, not this plan — by the per-package split.)

**Placeholder scan:** No TBD/TODO/“add error handling”/“similar to Task N”. Every code step shows full code; every run step shows the exact command + expected result.

**Type consistency:** `UiWidget` / `UiSchema` defined in Task 2 are used unchanged in Tasks 3–6 (`ui['ui:widget']`, `UiSchema` param/return types). `generateDefaultUiSchema` / `getUiField` / `setUiField` signatures match between impl (utils.ts) and tests. `setUiField`’s `Partial<UiSchema>` patch matches the test’s `{ 'ui:widget': 'textarea' }` / `{ 'ui:label': 'Name' }`. Index-signature `[property: string]: unknown` lets `ui.name` / `ui.items` hold nested `UiSchema` (cast at read sites).