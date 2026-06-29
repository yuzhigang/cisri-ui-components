# 组件库 npm 分包发布需求文档

> 版本：v1.0  
> 目标：构建一个基于 shadcn/ui 的 React 组件库，支持使用者按组件独立安装，避免全量引入；所有产物遵循 Peer Dependencies 模式，不将 Radix UI、tailwind-merge 等底层依赖打包进产物。

---

## 1. 项目目标

### 1.1 核心目标

- 提供一组可复用的 React UI 组件，组件内部基于 shadcn/ui 源码二次封装。
- 使用者可以通过 npm 单独安装某一个或某几个组件，例如：

  ```bash
  npm install @arim/user-profile-card @arim/order-form
  ```

  而不必安装整个库：

  ```bash
  npm install @arim/ui-components
  ```

- 每个组件包体积最小化，不重复打包底层依赖（Radix UI、tailwind-merge、class-variance-authority、clsx、lucide-react 等）。
- 依赖者项目中已安装的底层库实例被自动复用，避免多版本冲突和 Context 断裂。

### 1.2 非目标

- 不提供设计 token 生成器。
- 不托管私有 npm registry，使用 npmjs.org 公共 registry。

### 1.3 技术栈（明确锁定）

| 层级 | 技术选型 | 版本要求 | 说明 |
| ------ | ---------- | ---------- | ------ |
| **包管理器** | pnpm | ^9.0.0 | 使用 workspace 协议管理 Monorepo 子包；`node_modules` 扁平化、磁盘占用小、安装速度快。 |
| **运行时框架** | React | ^18.0.0 \|\| ^19.0.0 | 组件库目标运行环境；peerDependencies 中声明，不打包进产物。 |
| **DOM 渲染** | react-dom | ^18.0.0 \|\| ^19.0.0 | 与 React 同版本。 |
| **构建工具** | Vite | ^5.0.0 或 ^6.0.0 | 每个子包独立 `vite.config.ts`，通过 `build.lib` 输出 ESM + CJS。 |
| **React 编译插件** | @vitejs/plugin-react | ^4.0.0 | 处理 JSX、Fast Refresh（开发时）。 |
| **类型系统** | TypeScript | ^5.0.0 | 根目录 `tsconfig.base.json` 共享；子包继承并覆盖 `outDir`/`rootDir`。 |
| **组件基础** | shadcn/ui 源码 | 以官网最新为准 | 组件源码直接复制/内联到各子包，不通过 npm 依赖 shadcn。 |
| **Headless UI** | Radix UI | 按组件不同 | 例如 `@radix-ui/react-slot`、`@radix-ui/react-dialog`，作为 peerDependencies。 |
| **样式工具** | Tailwind CSS | ^3.4.0 或 ^4.0.0 | 组件类名基于 Tailwind；开发时用于类型检查，产物中不包含 Tailwind 运行时。 |
| **类名合并** | tailwind-merge + clsx | ^2.0.0 / ^2.0.0 | 公共 `cn()` 工具函数依赖。 |
| **变体系统** | class-variance-authority (cva) | ^0.7.0 | 内联原始组件（如 Button）的 variant/size 系统。 |
| **图标** | lucide-react | ^0.300.0 或更新 | 内联原始组件（如 Dialog、Select）内部图标来源。 |
| **Monorepo 管理** | pnpm workspaces | - | 通过 `pnpm-workspace.yaml` 定义 `packages/*`。 |
| **版本/发布** | 自研 Node 脚本（`.mjs`） | - | `scripts/build-all.mjs`、`scripts/publish-all.mjs`、`scripts/sync-peer-deps.mjs`。 |
| **CI/CD** | GitHub Actions | - | PR 时构建+类型检查；发布时自动按拓扑顺序发布变更包。 |
| **代码规范** | ESLint + Prettier | 可选但推荐 | 根目录统一配置，所有子包共享。 |

**关键约束：**

- 所有底层依赖（Radix UI、tailwind-merge、clsx、cva、lucide-react、React）全部作为 `peerDependencies`，不进入组件产物。
- 所有构建脚本使用 `.mjs`（ES Module），与根目录 `"type": "module"` 保持一致。
- 不使用 Lerna、Nx 等重型 Monorepo 任务调度工具，以降低复杂度；pnpm workspace + 自研脚本足够覆盖本需求。

---

## 2. 总体架构

### 2.1 仓库形态

- 采用 Monorepo 结构，所有组件源码存放在同一仓库，统一构建、统一版本策略。
- 每个组件对应一个独立的 npm 包（sub-package），发布到 npm 后拥有独立的包名、版本、依赖声明。
- 提供一个可选的 "全量包"（例如 `@arim/ui`），内部仅做 re-export，用于需要一次性安装全部组件的使用者。

### 2.2 目录结构

业务组件库的每个 npm 包内部会内联它所需的 shadcn 原始组件，因此单包结构如下：

```
001-ui-components/
├── package.json                 # 根 package.json，workspace 配置
├── pnpm-workspace.yaml          # pnpm workspace 定义
├── tsconfig.json                # 根 TypeScript 配置
├── tsconfig.base.json           # 共享 TS 配置，供子包继承
├── tailwind.config.ts           # 开发时 Tailwind 配置（用于类型检查）
├── vite.config.ts               # 根构建脚本入口（可选）
├── scripts/
│   ├── build-all.mjs            # 批量构建所有子包
│   ├── publish-all.mjs          # 批量发布/校验发布
│   └── sync-peer-deps.mjs       # 同步 peerDependencies 版本
├── packages/
│   ├── core/                    # 公共工具包（必须被每个组件依赖）
│   │   ├── package.json
│   │   ├── src/
│   │   │   ├── index.ts         # 导出 cn / composeRefs 等公共函数
│   │   │   └── utils.ts
│   │   └── tsconfig.json
│   ├── user-profile-card/       # 业务组件包示例
│   │   ├── package.json
│   │   ├── src/
│   │   │   ├── ui/              # 该业务组件内联的 shadcn 原始组件
│   │   │   │   ├── card.tsx
│   │   │   │   ├── avatar.tsx
│   │   │   │   ├── button.tsx
│   │   │   │   └── badge.tsx
│   │   │   ├── user-profile-card.tsx  # 业务组件实现
│   │   │   └── index.ts         # 仅导出 UserProfileCard
│   │   └── tsconfig.json
│   ├── order-form/              # 业务组件包示例
│   │   ├── package.json
│   │   ├── src/
│   │   │   ├── ui/              # 该业务组件内联的 shadcn 原始组件
│   │   │   │   ├── dialog.tsx
│   │   │   │   ├── select.tsx
│   │   │   │   ├── label.tsx
│   │   │   │   └── button.tsx
│   │   │   ├── order-form.tsx
│   │   │   └── index.ts
│   │   └── tsconfig.json
│   ├── data-table/
│   ├── appointment-calendar/
│   └── ui/                      # 全量包（可选）
│       ├── package.json
│       └── src/
│           └── index.ts         # re-export 所有业务组件
├── rule.md                      # 技术方案原文（必须保持有效）
└── REQUIREMENTS.md              # 本文档
```

**结构说明：**

- `packages/<business-component>/src/ui/`：该业务组件依赖的 shadcn 原始组件源码副本（按需内联）。
- `packages/<business-component>/src/<business-component>.tsx`：业务组件本身，组合 `src/ui/` 中的原始组件。
- 禁止把 `Button`、`Dialog` 等原子组件作为独立的 npm 包发布；它们只作为业务组件的内部实现存在。

### 2.3 包命名规范

- Scope：`@arim`（由发布者最终确定，需求文档中保留占位 `@arim`）。
- 单个组件包：`@arim/<kebab-case-business-component-name>`。
  - 例如：`@arim/user-profile-card`、`@arim/order-form`、`@arim/data-table`。
- 全量包：`@arim/ui` 或 `@arim/ui-components`。
- 公共工具包：`@arim/core`（仅包含 `cn`、`composeRefs` 等纯工具函数）。

---

## 3. 组件包详细要求

### 3.1 每个业务组件包必须包含的文件

每个 `packages/<business-component>/` 目录下至少包含：

```
packages/<business-component>/
├── package.json
├── tsconfig.json
└── src/
    ├── ui/                       # 该业务组件依赖的 shadcn 原始组件（按需内联）
    │   ├── card.tsx
    │   └── button.tsx
    ├── <business-component>.tsx  # 业务组件实现
    └── index.ts                  # 业务组件导出入口
```

- `package.json`：独立名称、版本、入口、peerDependencies、dependencies。
- `tsconfig.json`：继承根目录 `tsconfig.base.json`，指定 `outDir` 为 `dist`。
- `src/ui/*.tsx`：从 shadcn/ui 复制的原始组件源码，内部直接 import Radix UI 等底层库。
- `src/<business-component>.tsx`：业务组件本身，组合 `src/ui/` 中的原始组件。
- `src/index.ts`：仅导出该业务组件对外暴露的类型和组件。

### 3.2 package.json 模板（单个业务组件包）

以下以 `@arim/user-profile-card` 为例，必须满足字段和策略：

```json
{
  "name": "@arim/user-profile-card",
  "version": "1.0.0",
  "description": "User profile card business component based on shadcn/ui",
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
  "dependencies": {
    "@arim/core": "workspace:*"
  },
  "peerDependencies": {
    "react": "^18.0.0 || ^19.0.0",
    "react-dom": "^18.0.0 || ^19.0.0",
    "@radix-ui/react-avatar": "^1.0.0",
    "@radix-ui/react-slot": "^1.0.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.0.0",
    "tailwind-merge": "^2.0.0"
  },
  "peerDependenciesMeta": {
    "@radix-ui/react-avatar": { "optional": true },
    "@radix-ui/react-slot": { "optional": true },
    "class-variance-authority": { "optional": true },
    "clsx": { "optional": true },
    "tailwind-merge": { "optional": true }
  },
  "devDependencies": {
    "@types/react": "^18.0.0",
    "@types/react-dom": "^18.0.0",
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "typescript": "^5.0.0",
    "vite": "^5.0.0"
  }
}
```

**约束说明：**

- `dependencies` 只能依赖本仓库内的 `@arim/core`，不得依赖任何 Radix UI、Tailwind 工具等外部运行时库。
- `peerDependencies` 中必须列出该业务组件实际 import 的所有底层库（包括其 `src/ui/` 内联原始组件所依赖的 Radix UI 包）。
- 未使用的底层库不得出现在 `peerDependencies` 中（每个业务组件包只声明自己需要的）。
- `peerDependenciesMeta` 中所有底层依赖均标记为 `optional`，避免使用者安装未使用组件时被迫安装对应底层库。
- `files` 只发布 `dist` 目录，源码不进入 npm 包。
- `sideEffects` 必须设为 `false`，支持 tree-shaking。

### 3.3 业务组件源码引用规范

以 `packages/user-profile-card/src/user-profile-card.tsx` 为例，必须遵循：

```tsx
import * as React from "react";
import { Card, CardContent, CardHeader } from "./ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { cn } from "@arim/core";

export interface UserProfileCardProps {
  name: string;
  role: string;
  avatarUrl?: string;
  status?: "active" | "inactive";
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
  onContact?: () => void;
}

export function UserProfileCard({
  name,
  role,
  avatarUrl,
  status = "active",
  className,
  headerClassName,
  contentClassName,
  onContact,
}: UserProfileCardProps) {
  return (
    <Card className={cn("w-[360px] bg-card text-card-foreground", className)}>
      <CardHeader className={cn("flex flex-row items-center gap-4", headerClassName)}>
        <Avatar>
          <AvatarImage src={avatarUrl} alt={name} />
          <AvatarFallback>{name.slice(0, 2)}</AvatarFallback>
        </Avatar>
        <div className="flex flex-col gap-1">
          <span className="font-semibold">{name}</span>
          <span className="text-sm text-muted-foreground">{role}</span>
        </div>
        <Badge variant={status === "active" ? "default" : "secondary"}>
          {status}
        </Badge>
      </CardHeader>
      <CardContent className={contentClassName}>
        <Button onClick={onContact}>Contact</Button>
      </CardContent>
    </Card>
  );
}
```

**内联原始组件（`src/ui/avatar.tsx`）中的引用方式：**

```tsx
import * as React from "react";
import * as AvatarPrimitive from "@radix-ui/react-avatar";
import { cn } from "@arim/core";

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn("relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full", className)}
    {...props}
  />
));
Avatar.displayName = AvatarPrimitive.Root.displayName;

// AvatarImage、AvatarFallback 同理...

export { Avatar, AvatarImage, AvatarFallback };
```

**强制规则：**

- 工具函数 `cn` 必须从 `@arim/core` import；禁止在每个业务组件包内重复定义 `cn`。
- 业务组件内部引用内联原始组件时，使用相对路径 `./ui/xxx`，例如 `import { Button } from "./ui/button"`。
- 内联原始组件内部引用 Radix UI 等底层库时，必须从 npm 包名 import，例如 `import * as AvatarPrimitive from "@radix-ui/react-avatar"`。
- 禁止 import 其他业务组件包的源码，业务组件包之间保持独立（组合组件除外，见 3.4）。
- `src/ui/` 中的原始组件必须是从 shadcn/ui 复制并内联，不得通过 npm 依赖 `@shadcn/ui`（该包不存在）。

### 3.4 组合业务组件（依赖其他业务组件包）

若某个业务组件需要组合其他已发布的业务组件，例如 `OrderDetailPanel` 依赖 `UserProfileCard` 和 `PaymentStatusBadge`：

- 优先在 `packages/order-detail-panel/src/order-detail-panel.tsx` 中直接 import 其他独立业务组件包：

  ```tsx
  import { UserProfileCard } from "@arim/user-profile-card";
  import { PaymentStatusBadge } from "@arim/payment-status-badge";
  ```

- 此时 `packages/order-detail-panel/package.json` 的 `dependencies` 必须声明：

  ```json
  {
    "dependencies": {
      "@arim/core": "workspace:*",
      "@arim/user-profile-card": "workspace:*",
      "@arim/payment-status-badge": "workspace:*"
    }
  }
  ```

- 发布前，workspace 协议必须被替换为实际版本号（见 6.3）。

**注意：** 组合业务组件不应直接依赖其他业务组件包内部的 `src/ui/` 原始组件；如果需要复用原始组件，应在当前包内部自行内联一份，或抽象到 `@arim/core`（若确实跨包复用）。

### 3.5 样式可覆盖性与使用者主题

本组件库的核心设计原则之一是：**业务组件提供默认视觉风格，但使用者必须能够完全覆盖它**。为此，所有组件必须满足以下要求。

#### 3.5.1 必须提供 `className` 扩展点

- 每个业务组件的根元素必须接受 `className` prop，并通过 `cn(...)` 将其合并到默认类名中。
- `cn` 合并顺序必须保证**使用者的 `className` 最后传入**，从而具备最高覆盖优先级。

示例：

```tsx
export function UserProfileCard({ className, ...props }: UserProfileCardProps) {
  return (
    <Card className={cn("w-[360px] bg-card text-card-foreground", className)} {...props} />
  );
}
```

#### 3.5.2 优先使用 CSS 变量，而非固定色值

- 所有视觉样式必须基于 shadcn/ui 标准 CSS 变量，例如：
  - `--background` / `--foreground`
  - `--card` / `--card-foreground`
  - `--primary` / `--primary-foreground`
  - `--secondary` / `--secondary-foreground`
  - `--muted` / `--muted-foreground`
  - `--border` / `--input` / `--ring`
- 禁止在组件源码中写死具体颜色（如 `bg-blue-500`、`text-gray-700`），除非该颜色是组件语义的一部分且允许被覆盖。
- 允许使用 Tailwind 的 spacing、layout、radius 工具类，但颜色类必须来自 CSS 变量映射（如 `bg-primary`、`text-muted-foreground`）。

#### 3.5.3 复杂组件的子组件类名扩展点

对于结构复杂的业务组件，除根节点 `className` 外，还应暴露关键子区域的 `className` 插槽：

```tsx
export interface UserProfileCardProps {
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
  avatarClassName?: string;
  // ...
}
```

#### 3.5.4 禁止内联样式

- 组件源码中禁止使用 `style={{ ... }}` 设置视觉样式。
- 动态样式（如宽度、高度）应通过 `className` 或 CSS 变量传递；若必须动态计算，优先使用 CSS 自定义属性。

#### 3.5.5 默认样式必须可被 Tailwind 覆盖

- 组件默认类名应全部是可被 Tailwind 工具类覆盖的原子类。
- 避免使用 `:where()`、`:is()` 等降低特异性的复杂选择器，也避免使用内嵌 CSS 或 CSS-in-JS。

#### 3.5.6 文档与演示站点要求

- 每个组件的 README 和文档站点必须包含「自定义样式」小节，展示如何通过 `className` 覆盖默认外观。
- 文档站点必须提供一个**主题切换示例**（如深色/浅色/企业品牌色），证明使用者可以通过重新定义 CSS 变量完全改变组件外观。
- 演示站点中的每个组件至少展示两个版本：
  1. **默认主题**：使用 shadcn 标准 CSS 变量。
  2. **自定义主题**：使用使用者自定义的 CSS 变量或 `className`。

#### 3.5.7 对使用者的要求

- 使用者项目必须自行引入并维护 shadcn/ui 的 CSS 变量定义。
- 使用者可以通过覆盖 CSS 变量（推荐）或传入 `className`（精细控制）来自定义组件外观。
- 组件库本身不强制注入任何全局样式或字体。

---

## 4. 公共工具包 `@arim/core`

### 4.1 职责

- 存放所有组件共享的纯工具函数和类型。
- 每个组件包必须依赖 `@arim/core`，但 `@arim/core` 自身不依赖任何组件包。

### 4.2 必须包含的内容

```ts
// packages/core/src/utils.ts
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

```ts
// packages/core/src/index.ts
export { cn } from "./utils";
```

### 4.3 package.json 特殊要求

```json
{
  "name": "@arim/core",
  "version": "1.0.0",
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
  "peerDependencies": {
    "clsx": "^2.0.0",
    "tailwind-merge": "^2.0.0"
  },
  "peerDependenciesMeta": {
    "clsx": { "optional": true },
    "tailwind-merge": { "optional": true }
  }
}
```

---

## 5. 构建与产物要求

### 5.1 构建工具

- 使用 Vite + `@vitejs/plugin-react` 进行构建。
- 每个组件包独立拥有 `vite.config.ts`，但可共享根目录的 Vite 配置片段。

### 5.2 Vite 配置模板

每个组件包的 `vite.config.ts` 必须满足：

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { peerDependencies, dependencies } from "./package.json" assert { type: "json" };

export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: "./src/index.ts",
      name: "MyComponent",
      fileName: "index",
      formats: ["es", "cjs"],
    },
    rollupOptions: {
      external: [
        ...Object.keys(peerDependencies),
        ...Object.keys(dependencies),
        "react/jsx-runtime",
      ],
      output: {
        globals: {
          react: "React",
          "react-dom": "ReactDOM",
        },
      },
    },
  },
});
```

**强制规则：**

- `peerDependencies` 和 `dependencies` 中的所有包必须 external，禁止打包进产物。
- `react/jsx-runtime` 必须显式 external。
- 产物格式必须同时生成 `es`（ESM）和 `cjs`（CJS），并在 `package.json` 的 `exports` 中正确声明。

### 5.3 TypeScript 配置要求

根目录 `tsconfig.base.json`：

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

子包 `tsconfig.json`：

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"]
}
```

### 5.4 产物目录结构

每个业务组件包构建后必须生成：

```
packages/user-profile-card/dist/
├── index.js              # ESM 产物
├── index.cjs             # CJS 产物
├── index.d.ts            # 类型声明
├── index.d.ts.map        # 类型 source map
└── index.js.map          # JS source map
```

---

## 6. 发布策略

### 6.1 版本管理

- 采用 **独立版本模式（independent versioning）**：每个组件包拥有独立版本号。
- 当某个组件更新时，只提升该组件包的版本，不影响其他组件包。
- 全量包 `@arim/ui` 的版本单独维护，其 `dependencies` 中记录各组件的最低兼容版本。

### 6.2 发布前检查清单

每个组件包发布前必须完成：

- [ ] 执行 `npm run build`，产物目录 `dist/` 存在且无报错。
- [ ] TypeScript 类型检查通过。
- [ ] `package.json` 中 `peerDependencies` 与实际源码 import 的底层库一致。
- [ ] `workspace:*` 依赖已替换为实际版本号。
- [ ] `CHANGELOG.md` 已更新（可选但推荐）。
- [ ] `npm pack --dry-run` 检查发布内容，确认仅包含 `dist/`。

### 6.3 workspace 协议替换

在发布前，构建脚本必须将 `dependencies` 中的 `workspace:*` 替换为对应包的当前版本号。

示例转换：

```json
// 开发时
"dependencies": {
  "@arim/core": "workspace:*"
}

// 发布前自动替换为
"dependencies": {
  "@arim/core": "^1.0.0"
}
```

实现方式：通过 `scripts/publish-all.mjs` 读取 `packages/core/package.json` 的 `version`，写入当前组件包的 `dependencies` 后执行发布，发布成功后恢复 `workspace:*`。

### 6.4 批量发布脚本

`scripts/publish-all.mjs` 必须支持：

- 仅发布有变动的包（通过对比 git tag 或本地版本与 registry 版本）。
- 按依赖拓扑顺序发布（先 `@arim/core`，再依赖它的组件包）。
- 校验每个包的 `peerDependencies` 是否完整。
- 提供 `--dry-run` 模式，仅打印待发布包不实际发布。

---

## 7. 使用者安装体验

### 7.1 单独安装某个业务组件

```bash
npm install @arim/user-profile-card
```

npm 会提示缺少的 peer dependencies，使用者按需安装：

```bash
npm install @radix-ui/react-avatar @radix-ui/react-slot class-variance-authority clsx tailwind-merge
```

### 7.2 同时安装多个业务组件

```bash
npm install @arim/user-profile-card @arim/order-form @arim/data-table
```

### 7.3 全量安装（可选）

```bash
npm install @arim/ui
```

`@arim/ui` 本身依赖所有组件包，因此会拉取全部组件。

### 7.4 对使用者的要求（必须在 README 中明确）

- 项目必须已配置 Tailwind CSS，并且 `content` 路径包含 `node_modules/@arim/*/dist/**/*.{js,cjs}`，确保组件类名被扫描。
- 项目必须已引入 shadcn/ui 的 CSS 变量定义（如 `:root { --background: ... }`）。
- 禁止在安装本库时使用 `--legacy-peer-deps`，除非使用者明确了解多版本 Radix 共存的风险。

---

## 8. 版本兼容性与测试

### 8.1 peerDependencies 版本范围

- React：`^18.0.0 || ^19.0.0`
- Radix 相关：`^1.0.0` 或 `^2.0.0`（根据具体包当前主版本）。
- tailwind-merge：`^2.0.0`
- class-variance-authority：`^0.7.0`
- clsx：`^2.0.0`
- lucide-react：`^0.300.0`

### 8.2 兼容性矩阵测试

CI 必须至少测试以下组合：

- React 18 + 各 peer dependency 最低版本。
- React 18 + 各 peer dependency 最新 minor 版本。
- React 19 + 各 peer dependency 最新版本（若 React 19 已 GA）。

### 8.3 运行时检查

- 业务组件内部若内联了使用 React Context 的 shadcn 原始组件（如 Dialog、Popover、Select），必须在对应原始组件中添加开发环境检查：若 Radix Context 不存在或存在多版本，在控制台输出明确警告。
- 检查代码示例（位于 `src/ui/dialog.tsx` 等原始组件内部）：

  ```ts
  if (process.env.NODE_ENV !== "production") {
    try {
      const ctx = DialogPrimitive.useDialogContext?.();
      if (!ctx) {
        console.warn("[@arim/order-form / DialogPrimitive] DialogPrimitive context not found. ...");
      }
    } catch {}
  }
  ```

---

## 9. 文档要求

### 9.1 每个组件包必须包含的文档

- `README.md`：安装命令、peer dependencies 列表、基础使用示例、Tailwind content 配置提示。
- `CHANGELOG.md`：版本变更记录（推荐）。

### 9.2 README 模板（以 user-profile-card 为例）

```markdown
# @arim/user-profile-card

基于 shadcn/ui 的用户资料卡业务组件。

## 安装

```bash
npm install @arim/user-profile-card
```

## Peer Dependencies

本组件依赖以下库，请确保你的项目已安装：

```bash
npm install react react-dom @radix-ui/react-avatar @radix-ui/react-slot class-variance-authority clsx tailwind-merge
```

## 使用

```tsx
import { UserProfileCard } from "@arim/user-profile-card";

export default function App() {
  return (
    <UserProfileCard
      name="Alice Chen"
      role="Product Manager"
      status="active"
      onContact={() => alert("Contact clicked")}
    />
  );
}
```

## Tailwind 配置

确保 `tailwind.config.ts` 的 `content` 包含：

```ts
content: [
  "./node_modules/@arim/user-profile-card/dist/**/*.{js,cjs}",
];
```

## 自定义样式

本组件基于 shadcn/ui 的 CSS 变量（如 `--card`、`--primary`）构建。你可以通过覆盖 CSS 变量或传入 `className` 来改变外观：

```tsx
// 通过 className 覆盖
<UserProfileCard
  name="Alice Chen"
  role="Product Manager"
  className="w-[480px] border-primary shadow-lg"
  headerClassName="bg-muted/50"
/>
```

```css
/* 通过 CSS 变量覆盖全局主题 */
:root {
  --card: 0 0% 100%;
  --card-foreground: 222 84% 5%;
  --primary: 221 83% 53%;
  --primary-foreground: 210 40% 98%;
}
```
```

### 9.3 演示与文档站点（融合）

项目必须提供一个**演示 + 文档二合一**的站点，目标是在展示组件效果的同时，直接给出使用说明和安装命令。

#### 9.3.1 站点形式

- 推荐在仓库根目录创建 `apps/docs/`（或 `docs-site/`）作为独立的 Vite + React 应用。
- 每个业务组件对应一个独立页面/路由，例如 `/components/user-profile-card`。
- 页面结构要求 **左侧导航 + 右侧内容**：
  - 左侧：组件列表导航，支持搜索。
  - 右侧：当前组件的实时演示区 + 文档说明区上下排列或左右分栏。

#### 9.3.2 每个组件页面必须包含的内容

1. **实时演示（Demo）**
   - 组件在真实场景下的可交互示例，例如 `UserProfileCard` 展示不同 `status` 状态。
   - 提供 Props 调节面板（可选但推荐），允许切换 `variant`、`size`、`status` 等常见属性。
   - **必须提供主题覆盖示例**：展示同一组件在默认主题、深色模式、自定义品牌色三种外观下的效果，证明使用者可以覆盖默认视觉风格。
2. **安装命令**
   - 明确显示 `npm install @arim/<component>`。
   - 列出必须手动安装的 peer dependencies。
3. **使用示例代码**
   - 可直接复制的 TSX 示例。
   - 示例应覆盖最常见的用法、一个复杂用法，以及**通过 `className` 覆盖样式的用法**。
4. **Props 表格**
   - 从 TypeScript 类型自动生成的 Props 说明（名称、类型、必填、默认值、说明）。
   - 必须明确标注哪些 Props 用于样式覆盖（如 `className`、`headerClassName`）。
5. **Tailwind / CSS 变量要求**
   - 提示使用者需要引入 shadcn CSS 变量，并在 Tailwind content 中添加对应路径。
   - 提供一段可复制的 CSS 变量片段，展示如何自定义主题。

#### 9.3.3 技术实现建议

- 使用 **Vite + React + React Router** 构建单页应用。
- 文档内容使用 **MDX** 或 Markdown 文件，放在 `apps/docs/content/<component>.mdx`。
- 演示组件直接 import 本地 workspace 中的业务组件包，例如：

  ```tsx
  import { UserProfileCard } from "@arim/user-profile-card";
  ```

- 站点本身**不发布到 npm**，仅作为 GitHub Pages / Vercel / 内部静态站点部署。

#### 9.3.4 与 README 的关系

- 每个组件包的 `README.md` 保持简洁（安装、基本用法、Tailwind 提示）。
- 详细的演示、Props 表格、复杂示例放到站点中，避免 README 过长。
- 站点的安装/用法内容应与 README 保持一致，发布前通过脚本或人工校验。

### 9.4 根目录文档

- `README.md`：项目简介、所有组件包列表、全量安装方式、贡献指南、文档站点链接。
- `REQUIREMENTS.md`：本需求文档。
- `rule.md`：技术方案原文。

---

## 10. CI/CD 要求

### 10.1 必须触发的 CI 检查

每次 Pull Request 和 push 到 main 分支时，必须执行：

- `pnpm install`（或 `npm install`）。
- 对每个组件包执行 `npm run build`。
- 对每个组件包执行 TypeScript 类型检查（`tsc --noEmit`）。
- 执行 peerDependencies 一致性检查脚本，确保 `package.json` 中声明的 peer deps 与源码 import 一致。

### 10.2 发布工作流

- 仅当手动触发或合并到 main 且版本号发生变化时执行发布。
- 发布前执行构建和测试。
- 发布完成后，在 GitHub 创建 Release Notes（可选）。

---

## 11. 风险与缓解方案

| 风险 | 影响 | 缓解方案 |
| ------ | ------ | ---------- |
| 多版本 Radix UI 共存导致 Context 断裂 | 高 | peerDependencies 标记为 optional 但给出明确警告；文档中禁止 `--legacy-peer-deps` 滥用；CI 测试最低/最高版本矩阵。 |
| 使用者未配置 Tailwind content 路径 | 高 | 每个组件 README 明确列出需要添加的 content 路径；提供一次性全局配置 `node_modules/@arim/*/dist/**/*.{js,cjs}`。 |
| 使用者缺少 shadcn CSS 变量 | 中 | 文档要求使用者复制 shadcn 的 `globals.css` 变量定义；全量包 README 提供完整 CSS 变量片段。 |
| workspace 依赖未替换导致发布失败 | 高 | 发布脚本自动替换 `workspace:*`；发布前执行 `npm pack --dry-run` 校验。 |
| 组件包 peerDependencies 声明不完整 | 中 | `scripts/sync-peer-deps.mjs` 扫描源码 import 并与 package.json 对比，CI 中强制检查。 |
| 独立版本号管理混乱 | 中 | 使用 Changesets 或自研发布脚本记录变更；每个组件独立 CHANGELOG。 |

---

## 12. 验收标准

### 12.1 功能验收

- [ ] 使用者可以仅安装 `@arim/user-profile-card` 并在 React 项目中成功渲染 UserProfileCard。
- [ ] 使用者可以仅安装 `@arim/order-form` 并在 React 项目中成功渲染 OrderForm。
- [ ] 同时安装 `@arim/user-profile-card` 和 `@arim/order-form` 时，`@arim/core` 只被安装一次，不存在重复打包。
- [ ] 每个业务组件包的产物 `dist/` 中不包含 Radix UI、tailwind-merge、clsx、class-variance-authority 的代码。
- [ ] 使用者可以通过传入 `className` 覆盖业务组件的默认视觉样式。
- [ ] 使用者可以通过重新定义 shadcn CSS 变量（如 `--primary`、`--card`）改变所有业务组件的主题风格。
- [ ] 文档站点为每个组件提供默认主题、深色模式、自定义品牌色三种外观的实时演示。

### 12.2 构建验收

- [ ] 执行 `pnpm build`（或 `npm run build`）后，所有组件包均生成 `dist/index.js`、`dist/index.cjs`、`dist/index.d.ts`。
- [ ] 构建产物无 TypeScript 错误、无 ESLint 错误。

### 12.3 发布验收

- [ ] 执行发布脚本后，每个组件包在 npm registry 上拥有独立页面和独立版本号。
- [ ] 发布后的包 `package.json` 中不包含 `workspace:*`。
- [ ] `npm pack` 输出中只包含 `dist/`、`package.json`、`README.md`、`CHANGELOG.md`（若存在）。

---

> 注：实际实现时，以 shadcn/ui 官网提供的组件源码为准，按需复制内联到各业务组件包的 `src/ui/` 目录。
