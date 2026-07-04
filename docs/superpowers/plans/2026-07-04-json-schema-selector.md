# JsonSchemaSelector Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create `@cisri/json-schema-selector` as an independent business component package, extract shared JSON Schema types/utilities into `@cisri/json-schema-core`, and refactor `@cisri/json-schema-editor` to consume the new core package without breaking its public API.

**Architecture:** A new domain package `@cisri/json-schema-core` holds pure `JsonSchema`/`JsonSchemaType` types and `generateSampleData`. Both `json-schema-editor` and `json-schema-selector` depend on it. The selector renders a Dialog with a searchable schema list, a schema preview, and generated sample data, delegating search to the caller via `onSearch`.

**Tech Stack:** pnpm workspace, Vite, TypeScript, React, Radix UI Dialog, shadcn/ui components, Tailwind CSS, Vitest + Testing Library.

---

## File Structure

### New files

- `packages/json-schema-core/package.json`
- `packages/json-schema-core/tsconfig.json`
- `packages/json-schema-core/vite.config.ts`
- `packages/json-schema-core/README.md`
- `packages/json-schema-core/src/index.ts`
- `packages/json-schema-core/src/utils.ts`
- `packages/json-schema-core/src/utils.test.ts`
- `packages/json-schema-selector/package.json`
- `packages/json-schema-selector/tsconfig.json`
- `packages/json-schema-selector/vite.config.ts`
- `packages/json-schema-selector/README.md`
- `packages/json-schema-selector/src/index.ts`
- `packages/json-schema-selector/src/json-schema-selector.tsx`
- `packages/json-schema-selector/src/json-schema-selector.test.tsx`
- `packages/json-schema-selector/src/ui/button.tsx`
- `packages/json-schema-selector/src/ui/dialog.tsx`
- `packages/json-schema-selector/src/ui/input.tsx`
- `packages/json-schema-selector/src/ui/scroll-area.tsx`
- `packages/json-schema-selector/src/ui/separator.tsx`
- `packages/json-schema-selector/src/ui/skeleton.tsx`

### Modified files

- `pnpm-workspace.yaml` — add new packages to workspace globs.
- `packages/json-schema-editor/package.json` — add `@cisri/json-schema-core` dependency.
- `packages/json-schema-editor/src/schema-utils.ts` — remove `JsonSchemaType`, `JsonSchema`, `generateSampleData`; import from `@cisri/json-schema-core`.
- `packages/json-schema-editor/src/index.ts` — re-export `JsonSchema` and `JsonSchemaType` from core for backward compatibility.

---

## Task 1: Create `@cisri/json-schema-core` package with types and utilities

**Files:**
- Create: `packages/json-schema-core/package.json`
- Create: `packages/json-schema-core/tsconfig.json`
- Create: `packages/json-schema-core/vite.config.ts`
- Create: `packages/json-schema-core/src/index.ts`
- Create: `packages/json-schema-core/src/utils.ts`
- Create: `packages/json-schema-core/src/utils.test.ts`

- [ ] **Step 1: Create package manifest**

Create `packages/json-schema-core/package.json`:

```json
{
  "name": "@cisri/json-schema-core",
  "version": "1.0.0",
  "description": "Shared JSON Schema types and utilities for @cisri business components",
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
    "prepublishOnly": "npm run build"
  },
  "publishConfig": {
    "access": "public"
  },
  "devDependencies": {
    "typescript": "^5.4.5",
    "vite": "^5.2.11"
  }
}
```

- [ ] **Step 2: Create TypeScript config**

Create `packages/json-schema-core/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
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

- [ ] **Step 3: Create Vite config**

Create `packages/json-schema-core/vite.config.ts`:

```ts
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: './src/index.ts',
      name: 'JsonSchemaCore',
      formats: ['es', 'cjs'],
      fileName: (format) => `index.${format === 'es' ? 'js' : 'cjs'}`,
    },
    rollupOptions: {
      external: [],
    },
  },
});
```

- [ ] **Step 4: Create source files**

Create `packages/json-schema-core/src/index.ts`:

```ts
export type { JsonSchemaType, JsonSchema } from './utils';
export { generateSampleData } from './utils';
```

Create `packages/json-schema-core/src/utils.ts`:

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
```

- [ ] **Step 5: Write tests for generateSampleData**

Create `packages/json-schema-core/src/utils.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { generateSampleData } from './utils';

describe('generateSampleData', () => {
  it('returns default values for primitives', () => {
    expect(generateSampleData({ type: 'string' })).toBe('string');
    expect(generateSampleData({ type: 'number' })).toBe(0);
    expect(generateSampleData({ type: 'integer' })).toBe(0);
    expect(generateSampleData({ type: 'boolean' })).toBe(true);
  });

  it('generates an object from properties', () => {
    expect(
      generateSampleData({
        type: 'object',
        properties: {
          name: { type: 'string' },
          age: { type: 'integer' },
        },
      })
    ).toEqual({ name: 'string', age: 0 });
  });

  it('generates an array from items', () => {
    expect(
      generateSampleData({
        type: 'array',
        items: { type: 'string' },
      })
    ).toEqual(['string']);
  });

  it('returns null for unknown types', () => {
    expect(generateSampleData({})).toBeNull();
  });

  it('returns empty object for object without properties', () => {
    expect(generateSampleData({ type: 'object' })).toEqual({});
  });

  it('returns empty array for array without items', () => {
    expect(generateSampleData({ type: 'array' })).toEqual([]);
  });
});
```

- [ ] **Step 6: Add test script and run tests**

Modify `packages/json-schema-core/package.json` to add:

```json
"scripts": {
  "build": "tsc && vite build",
  "prepublishOnly": "npm run build",
  "test": "vitest run"
}
```

Run:

```bash
cd packages/json-schema-core
pnpm test
```

Expected: 6 tests pass.

- [ ] **Step 7: Commit**

```bash
git add packages/json-schema-core
git commit -m "feat(json-schema-core): add shared JSON Schema types and generateSampleData utility"
```

---

## Task 2: Refactor `@cisri/json-schema-editor` to use `@cisri/json-schema-core`

**Files:**
- Modify: `packages/json-schema-editor/package.json`
- Modify: `packages/json-schema-editor/src/schema-utils.ts`
- Modify: `packages/json-schema-editor/src/index.ts`

- [ ] **Step 1: Add dependency**

Modify `packages/json-schema-editor/package.json` `dependencies` to:

```json
"dependencies": {
  "@cisri/core": "workspace:*",
  "@cisri/json-schema-core": "workspace:*"
}
```

- [ ] **Step 2: Update schema-utils.ts**

Replace the top of `packages/json-schema-editor/src/schema-utils.ts` with:

```ts
import type { JsonSchema, JsonSchemaType } from '@cisri/json-schema-core';

export type { JsonSchema, JsonSchemaType };
```

Remove the local definitions of `JsonSchemaType`, `JsonSchema`, and `generateSampleData`. Remove `export function generateSampleData(...)` entirely.

The rest of `schema-utils.ts` stays unchanged.

- [ ] **Step 3: Update json-schema-editor.tsx import**

Modify `packages/json-schema-editor/src/json-schema-editor.tsx` line 23-33 to:

```ts
import {
  generateSampleData,
  type JsonSchema,
  type JsonSchemaType,
} from '@cisri/json-schema-core';
import {
  type SchemaField,
  buildField,
  defaultChildrenForType,
  ensureAtLeastOneField,
  fieldsToSchema,
  schemaToFields,
} from './schema-utils';
```

Remove line 35 `export type { JsonSchema, JsonSchemaType } from './schema-utils';`.

- [ ] **Step 4: Re-export from index.ts for backward compatibility**

Modify `packages/json-schema-editor/src/index.ts` to:

```ts
export { JsonSchemaEditor } from './json-schema-editor';
export type { JsonSchemaEditorProps } from './json-schema-editor';
export type { JsonSchema, JsonSchemaType } from '@cisri/json-schema-core';
```

- [ ] **Step 5: Install and run tests**

```bash
pnpm install
cd packages/json-schema-editor
pnpm test
```

Expected: 16 tests pass.

- [ ] **Step 6: Commit**

```bash
git add packages/json-schema-editor
git commit -m "refactor(json-schema-editor): depend on @cisri/json-schema-core for shared types and generateSampleData"
```

---

## Task 3: Add workspace entry for new packages

**Files:**
- Modify: `pnpm-workspace.yaml`

- [ ] **Step 1: Edit pnpm-workspace.yaml**

Ensure `pnpm-workspace.yaml` includes:

```yaml
packages:
  - 'packages/*'
  - 'apps/*'
```

If it already does, no change needed. Verify with:

```bash
pnpm -r list --depth=0
```

Expected: lists `@cisri/core`, `@cisri/json-schema-core`, `@cisri/json-schema-editor`, `@cisri/docs` (and later `@cisri/json-schema-selector`).

- [ ] **Step 2: Commit**

```bash
git add pnpm-workspace.yaml
git commit -m "chore: add json-schema-core to workspace"
```

---

## Task 4: Create shadcn/ui primitives for `@cisri/json-schema-selector`

**Files:**
- Create: `packages/json-schema-selector/src/ui/button.tsx`
- Create: `packages/json-schema-selector/src/ui/dialog.tsx`
- Create: `packages/json-schema-selector/src/ui/input.tsx`
- Create: `packages/json-schema-selector/src/ui/scroll-area.tsx`
- Create: `packages/json-schema-selector/src/ui/separator.tsx`
- Create: `packages/json-schema-selector/src/ui/skeleton.tsx`

- [ ] **Step 1: Copy/adapt button.tsx**

Create `packages/json-schema-selector/src/ui/button.tsx`. Copy from `packages/json-schema-editor/src/ui/button.tsx` and adapt imports to use local paths if needed.

Content from editor:

```tsx
import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@cisri/core';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive:
          'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline:
          'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
```

- [ ] **Step 2: Create dialog.tsx**

Create `packages/json-schema-selector/src/ui/dialog.tsx`:

```tsx
import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@cisri/core';

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = DialogPrimitive.Portal;
const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      'fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
      className
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        'fixed left-[50%] top-[50%] z-50 grid w-full max-w-4xl translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg',
        className
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'flex flex-col space-y-1.5 text-center sm:text-left',
      className
    )}
    {...props}
  />
);
DialogHeader.displayName = 'DialogHeader';

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2',
      className
    )}
    {...props}
  />
);
DialogFooter.displayName = 'DialogFooter';

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      'text-lg font-semibold leading-none tracking-tight',
      className
    )}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
```

- [ ] **Step 3: Create input.tsx**

Create `packages/json-schema-selector/src/ui/input.tsx`:

```tsx
import * as React from 'react';
import { cn } from '@cisri/core';

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export { Input };
```

- [ ] **Step 4: Create scroll-area.tsx**

Create `packages/json-schema-selector/src/ui/scroll-area.tsx`:

```tsx
import * as React from 'react';
import * as ScrollAreaPrimitive from '@radix-ui/react-scroll-area';
import { cn } from '@cisri/core';

const ScrollArea = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root>
>(({ className, children, ...props }, ref) => (
  <ScrollAreaPrimitive.Root
    ref={ref}
    className={cn('relative overflow-hidden', className)}
    {...props}
  >
    <ScrollAreaPrimitive.Viewport className="h-full w-full rounded-[inherit]">
      {children}
    </ScrollAreaPrimitive.Viewport>
    <ScrollBar />
    <ScrollAreaPrimitive.Corner />
  </ScrollAreaPrimitive.Root>
));
ScrollArea.displayName = ScrollAreaPrimitive.Root.displayName;

const ScrollBar = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>
>(({ className, orientation = 'vertical', ...props }, ref) => (
  <ScrollAreaPrimitive.ScrollAreaScrollbar
    ref={ref}
    orientation={orientation}
    className={cn(
      'flex touch-none select-none transition-colors',
      orientation === 'vertical' &&
        'h-full w-2.5 border-l border-l-transparent p-[1px]',
      orientation === 'horizontal' &&
        'h-2.5 flex-col border-t border-t-transparent p-[1px]',
      className
    )}
    {...props}
  >
    <ScrollAreaPrimitive.ScrollAreaThumb className="relative flex-1 rounded-full bg-border" />
  </ScrollAreaPrimitive.ScrollAreaScrollbar>
));
ScrollBar.displayName = ScrollAreaPrimitive.ScrollAreaScrollbar.displayName;

export { ScrollArea, ScrollBar };
```

- [ ] **Step 5: Create separator.tsx**

Create `packages/json-schema-selector/src/ui/separator.tsx`:

```tsx
import * as React from 'react';
import * as SeparatorPrimitive from '@radix-ui/react-separator';
import { cn } from '@cisri/core';

const Separator = React.forwardRef<
  React.ElementRef<typeof SeparatorPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SeparatorPrimitive.Root>
>(
  (
    { className, orientation = 'horizontal', decorative = true, ...props },
    ref
  ) => (
    <SeparatorPrimitive.Root
      ref={ref}
      decorative={decorative}
      orientation={orientation}
      className={cn(
        'shrink-0 bg-border',
        orientation === 'horizontal' ? 'h-[1px] w-full' : 'h-full w-[1px]',
        className
      )}
      {...props}
    />
  )
);
Separator.displayName = SeparatorPrimitive.Root.displayName;

export { Separator };
```

- [ ] **Step 6: Create skeleton.tsx**

Create `packages/json-schema-selector/src/ui/skeleton.tsx`:

```tsx
import { cn } from '@cisri/core';

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-muted', className)}
      {...props}
    />
  );
}

export { Skeleton };
```

- [ ] **Step 7: Commit**

```bash
git add packages/json-schema-selector/src/ui
git commit -m "chore(json-schema-selector): add shadcn/ui primitives"
```

---

## Task 5: Implement `@cisri/json-schema-selector` component

**Files:**
- Create: `packages/json-schema-selector/src/json-schema-selector.tsx`
- Create: `packages/json-schema-selector/src/index.ts`
- Modify: `packages/json-schema-selector/package.json`
- Modify: `packages/json-schema-selector/tsconfig.json`
- Modify: `packages/json-schema-selector/vite.config.ts`

- [ ] **Step 1: Create package.json**

Create `packages/json-schema-selector/package.json`:

```json
{
  "name": "@cisri/json-schema-selector",
  "version": "1.0.0",
  "description": "JSON Schema selector business component based on shadcn/ui",
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
    "test": "vitest run"
  },
  "publishConfig": {
    "access": "public"
  },
  "dependencies": {
    "@cisri/core": "workspace:*",
    "@cisri/json-schema-core": "workspace:*"
  },
  "peerDependencies": {
    "react": "^18.0.0 || ^19.0.0",
    "react-dom": "^18.0.0 || ^19.0.0",
    "@radix-ui/react-dialog": "^1.0.0",
    "@radix-ui/react-scroll-area": "^1.0.0",
    "@radix-ui/react-separator": "^1.0.0",
    "@radix-ui/react-slot": "^1.0.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.0.0",
    "lucide-react": "^0.300.0",
    "tailwind-merge": "^2.0.0"
  },
  "peerDependenciesMeta": {
    "@radix-ui/react-dialog": { "optional": true },
    "@radix-ui/react-scroll-area": { "optional": true },
    "@radix-ui/react-separator": { "optional": true },
    "@radix-ui/react-slot": { "optional": true },
    "class-variance-authority": { "optional": true },
    "clsx": { "optional": true },
    "lucide-react": { "optional": true },
    "tailwind-merge": { "optional": true }
  },
  "devDependencies": {
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "typescript": "^5.4.5",
    "vite": "^5.2.11"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

Create `packages/json-schema-selector/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "jsx": "react-jsx"
  },
  "include": ["src/**/*"],
  "exclude": ["dist", "node_modules", "**/*.test.tsx"]
}
```

- [ ] **Step 3: Create vite.config.ts**

Create `packages/json-schema-selector/vite.config.ts`:

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'JsonSchemaSelector',
      formats: ['es', 'cjs'],
      fileName: (format) => `index.${format === 'es' ? 'js' : 'cjs'}`,
    },
    rollupOptions: {
      external: [
        'react',
        'react-dom',
        '@cisri/core',
        '@cisri/json-schema-core',
        /@radix-ui\/react-.*/,
        'lucide-react',
        'class-variance-authority',
        'clsx',
        'tailwind-merge',
      ],
    },
  },
});
```

- [ ] **Step 4: Implement json-schema-selector.tsx**

Create `packages/json-schema-selector/src/json-schema-selector.tsx`:

```tsx
import * as React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@cisri/core';
import type { JsonSchema } from '@cisri/json-schema-core';
import { generateSampleData } from '@cisri/json-schema-core';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { Skeleton } from './ui/skeleton';
import { Search } from 'lucide-react';

export interface JsonSchemaEntry {
  id: string;
  name: string;
  description?: string;
  schema: JsonSchema;
}

export interface JsonSchemaSelectorClassNames {
  root?: string;
  trigger?: string;
  dialogContent?: string;
  searchInput?: string;
  list?: string;
  listItem?: string;
  previewPanel?: string;
  schemaPreview?: string;
  samplePreview?: string;
  footer?: string;
}

export interface JsonSchemaSelectorProps {
  entries: JsonSchemaEntry[];
  selectedId?: string;
  onSelect: (entry: JsonSchemaEntry) => void;
  onSearch?: (keyword: string) => void;
  searchDebounceMs?: number;
  loading?: boolean;
  trigger?: React.ReactNode;
  title?: string;
  emptyText?: string;
  searchPlaceholder?: string;
  className?: string;
  classNames?: JsonSchemaSelectorClassNames;
}

function useDebounce(value: string, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const handler = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(handler);
  }, [value, delay]);
  return debounced;
}

function JsonPreview({
  label,
  value,
  className,
}: {
  label: string;
  value: unknown;
  className?: string;
}) {
  const text = useMemo(
    () => JSON.stringify(value, null, 2),
    [value]
  );
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <h4 className="text-xs font-medium text-muted-foreground">{label}</h4>
      <pre className="rounded-md border border-border bg-muted/50 p-3 font-mono text-xs overflow-auto max-h-[240px]">
        {text}
      </pre>
    </div>
  );
}

export function JsonSchemaSelector({
  entries,
  selectedId,
  onSelect,
  onSearch,
  searchDebounceMs = 300,
  loading = false,
  trigger,
  title = '选择 Schema',
  emptyText = '暂无可用 schema',
  searchPlaceholder = '搜索 schema...',
  className,
  classNames,
}: JsonSchemaSelectorProps) {
  const [open, setOpen] = useState(false);
  const [keyword, setKeyword] = useState('');
  const debouncedKeyword = useDebounce(keyword, searchDebounceMs);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(selectedId ?? null);

  const effectiveId = pendingId ?? hoveredId;

  useEffect(() => {
    if (!open) return;
    onSearch?.(debouncedKeyword);
  }, [debouncedKeyword, onSearch, open]);

  useEffect(() => {
    if (open) {
      setPendingId(selectedId ?? null);
      setHoveredId(null);
      setKeyword('');
    }
  }, [open, selectedId]);

  const filteredEntries = useMemo(() => {
    if (onSearch) return entries;
    const lower = keyword.toLowerCase();
    return entries.filter(
      (entry) =>
        entry.name.toLowerCase().includes(lower) ||
        (entry.description?.toLowerCase().includes(lower) ?? false)
    );
  }, [entries, keyword, onSearch]);

  const selectedEntry = useMemo(
    () => entries.find((entry) => entry.id === effectiveId) ?? null,
    [entries, effectiveId]
  );

  const handleConfirm = useCallback(() => {
    const entry = entries.find((entry) => entry.id === pendingId);
    if (entry) {
      onSelect(entry);
      setOpen(false);
    }
  }, [entries, onSelect, pendingId]);

  return (
    <div className={cn(className)}>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          {trigger ?? (
            <Button type="button" className={classNames?.trigger}>
              选择 Schema
            </Button>
          )}
        </DialogTrigger>
        <DialogContent
          className={cn(
            'flex max-h-[80vh] flex-col overflow-hidden p-0',
            classNames?.dialogContent
          )}
        >
          <DialogHeader className="px-6 pt-6">
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>
              在左侧选择 schema，右侧可查看结构和示例数据。
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-1 overflow-hidden">
            <div className={cn('flex w-1/3 flex-col border-r border-border p-4', classNames?.list)}>
              <div className="relative mb-3">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={keyword}
                  onChange={(event) => setKeyword(event.target.value)}
                  placeholder={searchPlaceholder}
                  className={cn('pl-9', classNames?.searchInput)}
                  aria-label="搜索 schema"
                />
              </div>

              {loading ? (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : filteredEntries.length === 0 ? (
                <p className="text-sm text-muted-foreground">{emptyText}</p>
              ) : (
                <ScrollArea className="flex-1">
                  <div className="space-y-1 pr-3">
                    {filteredEntries.map((entry) => (
                      <button
                        key={entry.id}
                        type="button"
                        role="option"
                        aria-selected={pendingId === entry.id}
                        onClick={() => setPendingId(entry.id)}
                        onMouseEnter={() => setHoveredId(entry.id)}
                        onMouseLeave={() => setHoveredId((prev) => (prev === entry.id ? null : prev))}
                        className={cn(
                          'w-full rounded-md border border-transparent px-3 py-2 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground',
                          pendingId === entry.id && 'border-border bg-muted',
                          classNames?.listItem
                        )}
                      >
                        <div className="font-medium">{entry.name}</div>
                        {entry.description && (
                          <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                            {entry.description}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>

            <div className={cn('flex w-2/3 flex-col gap-4 overflow-auto p-4', classNames?.previewPanel)}>
              {selectedEntry ? (
                <>
                  <JsonPreview
                    label="Schema"
                    value={selectedEntry.schema}
                    className={classNames?.schemaPreview}
                  />
                  <JsonPreview
                    label="示例数据"
                    value={generateSampleData(selectedEntry.schema)}
                    className={classNames?.samplePreview}
                  />
                </>
              ) : (
                <div className="flex h-full flex-col items-center justify-center text-sm text-muted-foreground">
                  请从左侧选择一个 schema 以预览
                </div>
              )}
            </div>
          </div>

          <Separator />

          <DialogFooter className={cn('px-6 pb-6 pt-2', classNames?.footer)}>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              取消
            </Button>
            <Button type="button" onClick={handleConfirm} disabled={!pendingId}>
              确定
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

- [ ] **Step 5: Create index.ts**

Create `packages/json-schema-selector/src/index.ts`:

```ts
export { JsonSchemaSelector } from './json-schema-selector';
export type {
  JsonSchemaEntry,
  JsonSchemaSelectorClassNames,
  JsonSchemaSelectorProps,
} from './json-schema-selector';
```

- [ ] **Step 6: Run typecheck**

```bash
cd packages/json-schema-selector
pnpm exec tsc --noEmit
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add packages/json-schema-selector
git commit -m "feat(json-schema-selector): add JsonSchemaSelector component"
```

---

## Task 6: Add tests for `@cisri/json-schema-selector`

**Files:**
- Create: `packages/json-schema-selector/src/json-schema-selector.test.tsx`

- [ ] **Step 1: Create test file**

Create `packages/json-schema-selector/src/json-schema-selector.test.tsx`:

```tsx
import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { JsonSchemaSelector } from './json-schema-selector';

const entries = [
  {
    id: 'user',
    name: 'User',
    description: 'User profile schema',
    schema: {
      type: 'object' as const,
      title: 'User',
      properties: {
        name: { type: 'string' as const },
      },
    },
  },
  {
    id: 'order',
    name: 'Order',
    description: 'Order schema',
    schema: {
      type: 'object' as const,
      title: 'Order',
      properties: {
        id: { type: 'string' as const },
      },
    },
  },
];

describe('JsonSchemaSelector', () => {
  it('renders trigger button by default', () => {
    render(<JsonSchemaSelector entries={entries} onSelect={() => {}} />);
    expect(screen.getByRole('button', { name: '选择 Schema' })).toBeInTheDocument();
  });

  it('opens dialog when trigger is clicked', async () => {
    const user = userEvent.setup();
    render(<JsonSchemaSelector entries={entries} onSelect={() => {}} />);
    await user.click(screen.getByRole('button', { name: '选择 Schema' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('User')).toBeInTheDocument();
  });

  it('shows empty text when entries are empty', async () => {
    const user = userEvent.setup();
    render(
      <JsonSchemaSelector entries={[]} onSelect={() => {}} emptyText="无 schema" />
    );
    await user.click(screen.getByRole('button', { name: '选择 Schema' }));
    expect(screen.getByText('无 schema')).toBeInTheDocument();
  });

  it('filters entries locally by keyword', async () => {
    const user = userEvent.setup();
    render(<JsonSchemaSelector entries={entries} onSelect={() => {}} />);
    await user.click(screen.getByRole('button', { name: '选择 Schema' }));
    const search = screen.getByLabelText('搜索 schema');
    await user.type(search, 'order');
    await waitFor(() => {
      expect(screen.queryByText('User')).not.toBeInTheDocument();
      expect(screen.getByText('Order')).toBeInTheDocument();
    });
  });

  it('calls onSearch when search is external', async () => {
    const user = userEvent.setup();
    const onSearch = vi.fn();
    render(
      <JsonSchemaSelector
        entries={entries}
        onSelect={() => {}}
        onSearch={onSearch}
        searchDebounceMs={0}
      />
    );
    await user.click(screen.getByRole('button', { name: '选择 Schema' }));
    const search = screen.getByLabelText('搜索 schema');
    await user.type(search, 'foo');
    await waitFor(() => expect(onSearch).toHaveBeenCalledWith('foo'));
  });

  it('previews selected schema and sample data', async () => {
    const user = userEvent.setup();
    render(<JsonSchemaSelector entries={entries} onSelect={() => {}} />);
    await user.click(screen.getByRole('button', { name: '选择 Schema' }));
    await user.click(screen.getByText('User'));
    expect(screen.getByText(/"title": "User"/)).toBeInTheDocument();
    expect(screen.getByText(/"name": "string"/)).toBeInTheDocument();
  });

  it('calls onSelect with selected entry on confirm', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<JsonSchemaSelector entries={entries} onSelect={onSelect} />);
    await user.click(screen.getByRole('button', { name: '选择 Schema' }));
    await user.click(screen.getByText('Order'));
    await user.click(screen.getByRole('button', { name: '确定' }));
    await waitFor(() => {
      expect(onSelect).toHaveBeenCalledWith(entries[1]);
    });
  });

  it('disables confirm when no entry is selected', async () => {
    const user = userEvent.setup();
    render(<JsonSchemaSelector entries={entries} onSelect={() => {}} />);
    await user.click(screen.getByRole('button', { name: '选择 Schema' }));
    expect(screen.getByRole('button', { name: '确定' })).toBeDisabled();
  });

  it('applies custom classNames', async () => {
    const user = userEvent.setup();
    render(
      <JsonSchemaSelector
        entries={entries}
        onSelect={() => {}}
        classNames={{ listItem: 'custom-list-item' }}
      />
    );
    await user.click(screen.getByRole('button', { name: '选择 Schema' }));
    expect(screen.getByText('User').closest('button')).toHaveClass('custom-list-item');
  });
});
```

- [ ] **Step 2: Add test setup files**

Create `packages/json-schema-selector/vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test-setup.ts',
  },
});
```

Create `packages/json-schema-selector/src/test-setup.ts`:

```ts
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 3: Add missing devDependencies**

Modify `packages/json-schema-selector/package.json` devDependencies to include:

```json
"devDependencies": {
  "@testing-library/jest-dom": "^6.4.5",
  "@testing-library/react": "^15.0.7",
  "@testing-library/user-event": "^14.5.2",
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

- [ ] **Step 4: Run tests**

```bash
cd packages/json-schema-selector
pnpm test
```

Expected: 8 tests pass.

- [ ] **Step 5: Commit**

```bash
git add packages/json-schema-selector
git commit -m "test(json-schema-selector): add component tests for selection, search, and preview"
```

---

## Task 7: Build all packages and verify integration

**Files:**
- Modify: `packages/json-schema-core/vite.config.ts` (if needed)
- Modify: `packages/json-schema-editor/vite.config.ts` (externalize core packages)
- Modify: `packages/json-schema-selector/vite.config.ts` (already externalized)

- [ ] **Step 1: Ensure json-schema-core build works**

```bash
cd packages/json-schema-core
pnpm build
```

Expected: produces `dist/index.js`, `dist/index.cjs`, `dist/index.d.ts`.

- [ ] **Step 2: Update json-schema-editor vite.config.ts**

Modify `packages/json-schema-editor/vite.config.ts` rollupOptions.external to include `@cisri/json-schema-core`:

```ts
rollupOptions: {
  external: [
    'react',
    'react-dom',
    '@cisri/core',
    '@cisri/json-schema-core',
    /@radix-ui\/react-.*/,
    'lucide-react',
    'class-variance-authority',
    'clsx',
    'tailwind-merge',
  ],
},
```

- [ ] **Step 3: Build json-schema-editor**

```bash
cd packages/json-schema-editor
pnpm build
```

Expected: succeeds, no bundled `@cisri/json-schema-core` code in dist.

- [ ] **Step 4: Build json-schema-selector**

```bash
cd packages/json-schema-selector
pnpm build
```

Expected: succeeds, no bundled `@cisri/core` or `@cisri/json-schema-core` code in dist.

- [ ] **Step 5: Commit**

```bash
git add packages/json-schema-editor/vite.config.ts packages/json-schema-core/vite.config.ts packages/json-schema-selector/vitest.config.ts
git commit -m "chore: externalize @cisri/json-schema-core and add selector test setup"
```

---

## Task 8: Add docs/demo entry for JsonSchemaSelector

**Files:**
- Modify: `apps/docs/src/sections/DemoSection.tsx`

- [ ] **Step 1: Add a basic selector demo**

In `apps/docs/src/sections/DemoSection.tsx`, import and add a `<JsonSchemaSelector>` demo using the same sample entries pattern. Ensure `@cisri/json-schema-selector` is added as a dependency in `apps/docs/package.json`.

Example:

```tsx
import { JsonSchemaSelector } from '@cisri/json-schema-selector';

<JsonSchemaSelector
  entries={[
    {
      id: 'user',
      name: 'User',
      description: '用户资料 schema',
      schema: { type: 'object', title: 'User', properties: { name: { type: 'string' } } },
    },
    {
      id: 'order',
      name: 'Order',
      description: '订单 schema',
      schema: { type: 'object', title: 'Order', properties: { id: { type: 'string' } } },
    },
  ]}
  onSelect={(entry) => console.log('selected', entry)}
/>
```

- [ ] **Step 2: Verify docs dev server builds**

```bash
cd apps/docs
pnpm exec tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/docs
git commit -m "docs: add JsonSchemaSelector demo"
```

---

## Task 9: Final verification

- [ ] **Step 1: Run all tests**

```bash
pnpm -r test
```

Expected: all tests pass.

- [ ] **Step 2: Run all builds**

```bash
pnpm -r build
```

Expected: all packages build successfully.

- [ ] **Step 3: Commit any final fixes**

```bash
git add .
git commit -m "fix: address final integration issues"
```

---

## Spec Coverage Check

| Spec Section | Implementing Task |
|--------------|-------------------|
| Create `@cisri/json-schema-core` | Task 1 |
| Migrate `JsonSchema`/`JsonSchemaType`/`generateSampleData` from editor | Task 2 |
| Create `@cisri/json-schema-selector` package | Tasks 3, 4, 5 |
| Dialog with left list + right preview | Task 5 |
| External search via `onSearch` | Task 5 |
| `className` + `classNames` extension points | Task 5 |
| Tests for core + selector | Tasks 1, 6 |
| Build externalization | Task 7 |
| Docs demo | Task 8 |

## Placeholder Scan

No TBD/TODO placeholders. All file paths, code, commands, and expected outputs are explicit.

## Type Consistency Check

- `JsonSchemaEntry` used consistently across props and callbacks.
- `JsonSchemaSelectorClassNames` keys match implementation.
- `JsonSchema`/`JsonSchemaType` imported from `@cisri/json-schema-core` everywhere.
