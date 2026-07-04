# @cisri/json-schema-selector

A dialog-based JSON Schema selector business component built on shadcn/ui.

## Installation

```bash
pnpm add @cisri/json-schema-selector
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
