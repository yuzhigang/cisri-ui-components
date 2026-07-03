# @cisri/ui

基于 shadcn/ui 的 React 业务组件库。每个组件可独立安装，底层依赖（Radix UI、tailwind-merge 等）通过 `peerDependencies` 复用使用者项目中的实例。

## 特性

- 📦 **按需安装**：只安装你需要的业务组件，例如 `@cisri/json-schema-editor`。
- 🎨 **完全可覆盖样式**：组件使用 CSS 变量（如 `bg-primary`、`text-foreground`），使用者可通过 Tailwind 配置和 `:root` 变量完全控制视觉风格。
- 🔌 **Peer Dependencies 模式**：不将 Radix UI 等底层库打包进产物，避免版本冲突。
- 📚 **演示 + 文档融合站点**：每个组件配有实时 Demo 和安装/使用说明（开发中）。

## 安装示例

```bash
npm install @cisri/json-schema-editor
```

## 目录结构

```
.
├── packages/
│   ├── core/                  # 公共工具（cn 等）
│   └── json-schema-editor/    # 第一个业务组件
├── apps/
│   └── docs/                  # 文档与演示站点
├── scripts/
│   └── build-all.mjs          # 批量构建脚本
└── package.json
```

## 本地开发

```bash
pnpm install
pnpm build
```

## Tailwind 配置

使用本库的组件时，必须在 `tailwind.config.ts` 中扫描组件产物：

```ts
content: [
  './node_modules/@cisri/*/dist/**/*.{js,cjs}',
];
```

## CSS 变量

组件依赖 shadcn/ui 标准 CSS 变量。使用者项目需引入这些变量定义，或从 shadcn/ui 官方复制 `globals.css`。
