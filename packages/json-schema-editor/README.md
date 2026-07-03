# @cisri/json-schema-editor

A JSON Schema editor business component based on shadcn/ui.

## 安装

```bash
npm install @cisri/json-schema-editor
```

## Peer Dependencies

本组件依赖以下库，请确保你的项目已安装：

```bash
npm install react react-dom @radix-ui/react-checkbox @radix-ui/react-select @radix-ui/react-slot class-variance-authority clsx lucide-react tailwind-merge
```

## 使用

```tsx
import { useState } from 'react';
import { JsonSchemaEditor } from '@cisri/json-schema-editor';

export default function App() {
  const [schema, setSchema] = useState({
    type: 'object',
    title: 'User',
    properties: {
      name: { type: 'string' },
      age: { type: 'integer' },
    },
    required: ['name'],
  });

  return <JsonSchemaEditor value={schema} onChange={setSchema} />;
}
```

## Tailwind 配置

确保 `tailwind.config.ts` 的 `content` 包含以下路径，否则组件的 Tailwind 类名不会被扫描到：

```ts
content: [
  './node_modules/@cisri/json-schema-editor/dist/**/*.{js,cjs}',
];
```

如果同时使用多个 `@cisri/*` 组件，可以使用通配符：

```ts
content: [
  './node_modules/@cisri/*/dist/**/*.{js,cjs}',
];
```

## CSS 变量

本组件使用 shadcn/ui 标准 CSS 变量。你可以通过覆盖 `:root` 中的变量来自定义主题：

```css
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --card: 0 0% 100%;
  --card-foreground: 222.2 84% 4.9%;
  --popover: 0 0% 100%;
  --popover-foreground: 222.2 84% 4.9%;
  --primary: 222.2 47.4% 11.2%;
  --primary-foreground: 210 40% 98%;
  --secondary: 210 40% 96.1%;
  --secondary-foreground: 222.2 47.4% 11.2%;
  --muted: 210 40% 96.1%;
  --muted-foreground: 215.4 16.3% 46.9%;
  --accent: 210 40% 96.1%;
  --accent-foreground: 222.2 47.4% 11.2%;
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 210 40% 98%;
  --border: 214.3 31.8% 91.4%;
  --input: 214.3 31.8% 91.4%;
  --ring: 222.2 84% 4.9%;
  --radius: 0.5rem;
}
```

## 自定义样式

你可以通过 `className` 覆盖默认外观：

```tsx
<JsonSchemaEditor
  value={schema}
  onChange={setSchema}
  className="w-full max-w-2xl border-primary"
/>
```
