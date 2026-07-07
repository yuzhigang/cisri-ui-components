# @cisri/json-schema-form

A schema-driven JSON data form based on shadcn/ui (RJSF-style uiSchema). Given a `JsonSchema` (+ optional `uiSchema`), renders an editable form and emits JSON data via `onChange`.

> 与 `@cisri/json-schema-editor`（编辑 schema 结构）不同，本组件的输入是 schema，产出是 **JSON 数据**。

## 安装

```bash
npm install @cisri/json-schema-form
```

## Peer Dependencies

```bash
npm install react react-dom lucide-react
```

Radix/cva/clsx/tailwind-merge 由 `@cisri/shadcn` 与 `@cisri/core` 间接 peer（按其说明安装）。

## 使用

```tsx
import { useState } from 'react';
import { JsonSchemaForm } from '@cisri/json-schema-form';

export default function App() {
  const [data, setData] = useState({ name: '', age: 0 });
  const schema = {
    type: 'object',
    properties: { name: { type: 'string', title: 'Name' }, age: { type: 'integer', title: 'Age' } },
    required: ['name'],
  };
  return <JsonSchemaForm schema={schema} value={data} onChange={setData} />;
}
```

## uiSchema

可选 `uiSchema` prop（RJSF 风格 `ui:*` 键，来自 `@cisri/json-schema-ui-core`）控制每个字段的 widget/label/help/placeholder/order/hidden/disabled/readonly/classNames 等。缺省时用 `generateDefaultUiSchema(schema)`。

## Tailwind 配置

```ts
content: [
  './node_modules/@cisri/*/dist/**/*.{js,cjs}',
];
```

## CSS 变量

使用 shadcn/ui 标准 CSS 变量，可通过覆盖 `:root` 自定义主题。

## 自定义样式

```tsx
<JsonSchemaForm schema={schema} value={data} onChange={setData} className="w-full max-w-2xl" />
```