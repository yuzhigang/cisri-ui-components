# @cisri/db-schema-editor

A database table schema editor based on shadcn/ui. Structurally express a database table — table name, columns, types, and constraints — and edit it through a tree/table UI.

## 安装

```bash
npm install @cisri/db-schema-editor
```

## Peer Dependencies

本组件依赖以下库，请确保你的项目已安装：

```bash
npm install react react-dom @radix-ui/react-checkbox @radix-ui/react-select @radix-ui/react-slot class-variance-authority clsx lucide-react tailwind-merge
```

## 使用

```tsx
import { useState } from 'react';
import { DbSchemaEditor } from '@cisri/db-schema-editor';
import type { DbTable } from '@cisri/db-schema-core';

export default function App() {
  const [table, setTable] = useState<DbTable>({
    id: 't1',
    name: 'users',
    columns: [
      { id: 'c1', name: 'id', type: 'uuid', nullable: false, primaryKey: true },
      { id: 'c2', name: 'email', type: 'varchar', nullable: false, unique: true },
    ],
  });

  return <DbSchemaEditor value={table} onChange={setTable} />;
}
```

## Tailwind 配置

确保 `tailwind.config.ts` 的 `content` 包含以下路径，否则组件的 Tailwind 类名不会被扫描到：

```ts
content: [
  './node_modules/@cisri/db-schema-editor/dist/**/*.{js,cjs}',
];
```

如果同时使用多个 `@cisri/*` 组件，可以使用通配符：

```ts
content: [
  './node_modules/@cisri/*/dist/**/*.{js,cjs}',
];
```

## CSS 变量

本组件使用 shadcn/ui 标准 CSS 变量，可通过覆盖 `:root` 中的变量自定义主题。

## 自定义样式

```tsx
<DbSchemaEditor
  value={table}
  onChange={setTable}
  className="w-full max-w-2xl border-primary"
/>
```