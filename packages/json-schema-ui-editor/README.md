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