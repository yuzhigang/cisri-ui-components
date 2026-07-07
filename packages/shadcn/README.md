# @cisri/shadcn

Shared shadcn/ui primitives for `@cisri/*` business components. Re-exports the inlined shadcn atoms (Button, Input, Select, Checkbox, Table, Textarea, Dialog, ScrollArea, Separator, Skeleton) so every business package imports them from a single dependency — avoiding duplicate bundling of the atom wrappers.

> 本包是各业务组件包的**统一原子依赖**：业务包 `dependencies` 依赖 `@cisri/shadcn: workspace:*`，构建时 external，由使用方解析到同一实例。原始 shadcn 原子不再内联到各业务包 `src/ui/`。

## Peer Dependencies

本组件依赖以下库，请确保你的项目已安装：

```bash
pnpm add react react-dom @radix-ui/react-checkbox @radix-ui/react-dialog @radix-ui/react-scroll-area @radix-ui/react-select @radix-ui/react-separator @radix-ui/react-slot class-variance-authority lucide-react
```

`clsx` / `tailwind-merge` 由 `@cisri/core` 间接依赖（`cn`），按其说明安装。

## Tailwind 配置

确保 `tailwind.config.ts` 的 `content` 同时扫描业务包与 `@cisri/shadcn` 的产物，否则原子类名不会被扫描到：

```ts
content: [
  './node_modules/@cisri/shadcn/dist/**/*.{js,cjs}',
  './node_modules/@cisri/*/dist/**/*.{js,cjs}',
];
```