
---

## 技术方案：基于 shadcn/ui 的 npm 组件库（Peer Dependencies 模式）

### 1. 设计目标
- 组件库内部使用 shadcn/ui 组件（如 Button、Dialog、Select 等）
- 不将底层依赖（Radix UI、tailwind-merge 等）打包进产物，避免与依赖者项目中的版本冲突
- 依赖者安装后，组件库自动复用其项目中已有的底层库实例

### 2. 项目结构
```
my-shadcn-components/
├── src/
│   ├── components/           # 组件库自身组件
│   │   ├── my-dialog.tsx     # 你的业务组件，内部使用 shadcn 的 Dialog
│   │   └── my-form.tsx
│   ├── ui/                   # 从 shadcn 复制/内联的组件源码（仅你需要的）
│   │   ├── dialog.tsx        # shadcn Dialog 源码（不依赖 @radix-ui/react-dialog 的 npm 包，而是 import 它）
│   │   ├── button.tsx
│   │   └── select.tsx
│   ├── lib/
│   │   └── utils.ts          # cn() 工具函数（class-variance-authority + tailwind-merge）
│   └── index.ts              # 统一导出
├── package.json
├── vite.config.ts / rollup.config.js
├── tsconfig.json
└── tailwind.config.ts        # 若需要，用于开发时类型检查
```

### 3. package.json 依赖声明策略

**核心原则：shadcn 组件源码内联，底层库全部声明为 peerDependencies。**

```json
{
  "name": "@arim/my-shadcn-components",
  "version": "1.0.0",
  "type": "module",
  "main": "./dist/index.js",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "files": ["dist", "src"],
  "scripts": {
    "build": "tsc && vite build",
    "prepublishOnly": "npm run build"
  },
  "dependencies": {
    "react": "^18.0.0",
    "react-dom": "^18.0.0"
  },
  "peerDependencies": {
    "react": "^18.0.0 || ^19.0.0",
    "react-dom": "^18.0.0 || ^19.0.0",
    "@radix-ui/react-dialog": "^1.0.0",
    "@radix-ui/react-select": "^2.0.0",
    "@radix-ui/react-popover": "^1.0.0",
    "@radix-ui/react-slot": "^1.0.0",
    "@radix-ui/react-label": "^2.0.0",
    "tailwind-merge": "^2.0.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.0.0",
    "lucide-react": "^0.300.0"
  },
  "peerDependenciesMeta": {
    "@radix-ui/react-dialog": { "optional": true },
    "@radix-ui/react-select": { "optional": true },
    "@radix-ui/react-popover": { "optional": true },
    "@radix-ui/react-slot": { "optional": true },
    "@radix-ui/react-label": { "optional": true },
    "tailwind-merge": { "optional": true },
    "class-variance-authority": { "optional": true },
    "clsx": { "optional": true },
    "lucide-react": { "optional": true }
  },
  "devDependencies": {
    "@types/react": "^18.0.0",
    "@types/react-dom": "^18.0.0",
    "typescript": "^5.0.0",
    "vite": "^5.0.0",
    "@vitejs/plugin-react": "^4.0.0"
  }
}
```

**说明：**
- `dependencies` 中只放 React（因为 React 本身必须单例，但通常也放 peer）
- 所有 shadcn 底层依赖（Radix、tailwind-merge、class-variance-authority、lucide-react）全部放入 `peerDependencies`
- 标记为 `optional` 的意图：如果依赖者没用到某个组件，对应的 Radix 包可以不安

### 4. 构建配置（Vite / Rollup）

**关键：将 peerDependencies 中的包全部 external，不打包进产物。**

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { peerDependencies, dependencies } from './package.json' assert { type: 'json' };

export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: './src/index.ts',
      name: 'MyShadcnComponents',
      fileName: 'index',
      formats: ['es']
    },
    rollupOptions: {
      // 将所有 peerDependencies 和 dependencies 标记为外部依赖
      external: [
        ...Object.keys(peerDependencies),
        ...Object.keys(dependencies)
      ]
    }
  }
});
```

### 5. 组件源码中的引用方式

**shadcn 组件源码（src/ui/dialog.tsx）内部：**

```tsx
// 直接 import Radix UI 的 npm 包，不要 import 本地文件
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// ... 你的 shadcn Dialog 封装代码
```

**你的业务组件（src/components/my-dialog.tsx）内部：**

```tsx
// 引用内联的 shadcn 组件
import { Dialog, DialogContent, DialogTrigger } from "@/ui/dialog";

export function MyDialog({ children }: { children: React.ReactNode }) {
  return (
    <Dialog>
      <DialogTrigger>Open</DialogTrigger>
      <DialogContent>{children}</DialogContent>
    </Dialog>
  );
}
```

### 6. 对依赖者的要求（安装文档）

依赖者安装你的包时，需要确保其项目中已安装对应的底层库：

```bash
# 依赖者项目
npm install @arim/my-shadcn-components

# 如果依赖者项目没有这些库，npm 会发出 peer dependency 警告
# 依赖者需要手动安装（或你的包通过 peerDependencies 自动提示）：
npm install @radix-ui/react-dialog @radix-ui/react-select tailwind-merge class-variance-authority clsx lucide-react
```

### 7. 版本兼容性策略

- **宽松版本范围**：peerDependencies 中使用 `^1.0.0` 而非固定版本，允许依赖者使用更新的 minor/patch 版本
- **React 版本**：声明 `^18.0.0 || ^19.0.0` 以兼容 React 19
- **测试矩阵**：CI 中测试依赖者可能使用的最低和最高 peer dependency 版本

### 8. 风险与注意事项

| 风险 | 说明 | 缓解方案 |
|------|------|----------|
| **Context 断裂** | 若依赖者使用 npm 的 `--legacy-peer-deps` 导致多版本 Radix 共存 | 在文档中明确禁止，并在运行时检查（如 Dialog 的 Context 是否可用） |
| **Tailwind 类名前缀** | 你的组件内联了 shadcn 的 `cn()` 工具，依赖者的 Tailwind 配置可能不同 | 要求依赖者使用标准的 `tailwindcss` 配置，或在文档中说明需要的 content 路径 |
| **CSS 变量/主题** | shadcn 组件依赖 CSS 变量（如 `--background`） | 在文档中说明依赖者需要引入 shadcn 的 CSS 变量定义 |
