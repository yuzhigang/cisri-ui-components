# @cisri/json-schema-selector

A dialog-based JSON Schema selector business component built on shadcn/ui.

## Installation

```bash
pnpm add @cisri/json-schema-selector
```

## Peer Dependencies

This component relies on the following libraries. Make sure they are installed in your project:

```bash
pnpm add react react-dom @radix-ui/react-dialog @radix-ui/react-scroll-area @radix-ui/react-separator @radix-ui/react-slot class-variance-authority clsx lucide-react tailwind-merge
```

## Usage

```tsx
import { JsonSchemaSelector, JsonSchemaEntry } from '@cisri/json-schema-selector';

const entries: JsonSchemaEntry[] = [
  {
    id: 'user',
    name: 'User',
    description: 'User schema',
    schema: { type: 'object', properties: { name: { type: 'string' } } },
  },
];

export default function App() {
  return (
    <JsonSchemaSelector
      entries={entries}
      onSelect={(entry) => console.log('selected', entry)}
    />
  );
}
```

## Tailwind 配置

Ensure your `tailwind.config.ts` `content` array includes the package path so all component classes are scanned:

```ts
content: [
  './node_modules/@cisri/json-schema-selector/dist/**/*.{js,cjs}',
];
```

## 自定义样式

This component is built on top of shadcn/ui CSS variables (such as `--card`, `--primary`, `--muted`, etc.). You can override the appearance by redefining CSS variables or passing `className` / `classNames`:

```tsx
<JsonSchemaSelector
  entries={entries}
  onSelect={(entry) => console.log('selected', entry)}
  className="w-[720px]"
  classNames={{
    dialogContent: 'border-primary shadow-lg',
    list: 'bg-muted/30',
    schemaPreview: 'border-border',
  }}
/>
```

```css
/* Override global theme via CSS variables */
:root {
  --card: 0 0% 100%;
  --card-foreground: 222 84% 5%;
  --primary: 221 83% 53%;
  --primary-foreground: 210 40% 98%;
  --muted: 210 40% 96%;
  --muted-foreground: 215 16% 47%;
  --border: 214 32% 91%;
}
```

## Props

| Prop | Type | Description |
| --- | --- | --- |
| `entries` | `JsonSchemaEntry[]` | List of schema entries to select from. |
| `selectedId` | `string` | ID of the currently selected entry. |
| `onSelect` | `(entry: JsonSchemaEntry) => void` | Callback when an entry is confirmed. |
| `onSearch` | `(keyword: string) => void` | Optional external search handler. |
| `searchDebounceMs` | `number` | Debounce delay for local search (default: `300`). |
| `loading` | `boolean` | Show skeleton loaders. |
| `trigger` | `React.ReactNode` | Custom trigger element. |
| `title` | `string` | Dialog title. |
| `emptyText` | `string` | Text shown when no entries match. |
| `searchPlaceholder` | `string` | Search input placeholder. |
| `className` | `string` | Additional classes for the root element. |
| `classNames` | `JsonSchemaSelectorClassNames` | Style overrides for sub-components. |
