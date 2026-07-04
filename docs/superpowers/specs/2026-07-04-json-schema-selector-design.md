# JsonSchemaSelector 设计

## 背景

项目已有 `@cisri/json-schema-editor` 业务组件，支持以表格/JSON/预览三种视图编辑 JSON Schema。用户希望新增一个 `json-schema-selector` 组件，用于从一组预定义 schema 中选择一项。该组件以 Dialog 形式呈现：左侧为带搜索的 schema 列表，右侧为选中 schema 的 JSON 结构和示例数据预览，底部确认后返回选中的 schema。

## 目标

- 新增独立的 `@cisri/json-schema-selector` 业务组件包。
- 复用 JSON Schema 领域类型和通用工具，避免 editor 与 selector 直接耦合。
- 搜索逻辑外置，支持调用方通过 API 异步获取 schema 列表。
- 提供完整的 `className` 插槽，支持样式覆盖。
- 不破坏 `@cisri/json-schema-editor` 现有外部接口。

## 非目标

- 不内置 schema 数据源或 API 请求逻辑。
- 不支持 JSON Schema 高级特性（如 `oneOf`、`anyOf`、`$ref`）的特殊渲染。
- 不替代 editor 的模板管理功能，selector 只负责“选择并返回”。

## 整体架构

```
packages/
  core/                          # 只放 cn 等全项目通用工具
    src/
      index.ts
      utils.ts
  json-schema-core/              # 新增：JSON Schema 领域共享层
    src/
      index.ts                   # JsonSchema, JsonSchemaType
      utils.ts                   # generateSampleData
    package.json
    tsconfig.json
    vite.config.ts
    README.md
  json-schema-editor/            # 依赖 @cisri/core + @cisri/json-schema-core
  json-schema-selector/          # 依赖 @cisri/core + @cisri/json-schema-core
```

依赖关系：

- `@cisri/json-schema-editor` → `@cisri/core`, `@cisri/json-schema-core`
- `@cisri/json-schema-selector` → `@cisri/core`, `@cisri/json-schema-core`
- editor 与 selector 互不依赖，避免循环依赖。

## 数据模型

### `@cisri/json-schema-core`

从 `@cisri/json-schema-editor/src/schema-utils.ts` 迁移以下纯类型和通用工具：

```ts
export type JsonSchemaType =
  | 'object'
  | 'array'
  | 'string'
  | 'number'
  | 'boolean'
  | 'integer';

export interface JsonSchema {
  type?: JsonSchemaType;
  title?: string;
  description?: string;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
}

export function generateSampleData(schema: JsonSchema): unknown;
```

### `@cisri/json-schema-editor` 调整

`schema-utils.ts` 保留 editor 内部 UI 领域模型：

- `SchemaField`
- `generateId` / `resetIdCounter`
- `buildField`
- `defaultChildrenForType`
- `schemaToFields`
- `fieldsToSchema` / `fieldToSchema` / `fieldsToSchemaInner`
- `buildEmptyField`
- `ensureAtLeastOneField`

`JsonSchemaType`、`JsonSchema`、`generateSampleData` 改为从 `@cisri/json-schema-core` import。`src/index.ts` 继续 re-export `JsonSchema` 与 `JsonSchemaType`，保持向后兼容。

### `@cisri/json-schema-selector`

```ts
import type { JsonSchema } from '@cisri/json-schema-core';

export interface JsonSchemaEntry {
  id: string;
  name: string;
  description?: string;
  schema: JsonSchema;
}

export interface JsonSchemaSelectorClassNames {
  root?: string;
  trigger?: string;
  dialogContent?: string;
  searchInput?: string;
  list?: string;
  listItem?: string;
  previewPanel?: string;
  schemaPreview?: string;
  samplePreview?: string;
  footer?: string;
}

export interface JsonSchemaSelectorProps {
  entries: JsonSchemaEntry[];
  selectedId?: string;
  onSelect: (entry: JsonSchemaEntry) => void;
  onSearch?: (keyword: string) => void;
  searchDebounceMs?: number;
  loading?: boolean;
  trigger?: React.ReactNode;
  title?: string;
  emptyText?: string;
  searchPlaceholder?: string;
  className?: string;
  classNames?: JsonSchemaSelectorClassNames;
}
```

## UI 结构与交互

### 触发方式

组件默认以子节点作为触发按钮内容：

```tsx
<JsonSchemaSelector entries={entries} onSelect={handleSelect}>
  选择 Schema
</JsonSchemaSelector>
```

也可完全自定义触发节点：

```tsx
<JsonSchemaSelector
  entries={entries}
  onSelect={handleSelect}
  trigger={<IconButton />}
/>
```

### Dialog 内部布局

左侧约 1/3，右侧约 2/3：

- **左侧**
  - 顶部搜索输入框，实时触发搜索。
  - 下方滚动列表，显示 `name`；hover 显示 `description`。
  - 当前项高亮。
- **右侧**
  - 上部：当前选中 entry 的 JSON Schema，只读、monospace 格式。
  - 下部：通过 `generateSampleData` 生成的示例数据，只读。
- **底部**
  - 取消 / 确定按钮。
  - 确定后调用 `onSelect(entry)` 并关闭 Dialog。

### 搜索行为

- 当 `onSearch` 存在时，搜索框输入通过防抖（默认 300ms）触发 `onSearch(keyword)`，组件不做本地过滤。
- 当 `onSearch` 不存在时，退化为本地过滤，匹配 `name` 和 `description`。
- `loading` 控制列表区域显示 skeleton 还是 `entries`。

### 状态

- Dialog open 状态由组件内部管理。
- 弹窗内维护 `hoveredId` 与 `pendingSelectedId`：hover 更新预览，点击列表项设为 pending 选中，点确定才通过 `onSelect` 回调。
- 搜索关键词在组件内部维护。

## 样式与可覆盖性

- 颜色全部使用 CSS 变量：`bg-card`、`text-card-foreground`、`border-border`、`text-muted-foreground` 等。
- 不写死具体色值，不内联 `style`。
- 默认 className 与传入 className 通过 `cn()` 合并：

```tsx
className={cn('border-b border-border p-2', classNames?.previewPanel)}
```

- 根容器 props `className` 作用在最外层。
- `classNames` 提供各子区域扩展点。

## 错误处理与边界情况

| 场景 | 处理 |
|------|------|
| `entries` 为空 | 左侧显示 `emptyText`（默认“暂无可用 schema”） |
| 搜索无结果 | 左侧显示“未找到匹配 schema” |
| 未选中任何 entry 时点击确定 | 确定按钮 disabled |
| `selectedId` 指向不存在的 entry | 视为未选中 |
| `onSearch` 异步加载中 | 列表区域显示 skeleton 占位，`loading={true}` |
| 示例数据生成失败 | `generateSampleData` 返回 `null` 或默认值，右侧正常渲染 |

## 测试策略

### `@cisri/json-schema-core`

- `generateSampleData` 覆盖 object/array/primitive 各类型的输出。
- 边界：空 schema、无 items 的 array、无 properties 的 object。

### `@cisri/json-schema-selector`

- 渲染空列表、非空列表、搜索过滤/回调、选中高亮。
- 点击 entry 后右侧显示 schema 和示例数据。
- 点击确定触发 `onSelect` 并关闭 dialog。
- `onSearch` 被调用时验证防抖行为。
- `classNames` 正确作用到对应区域。

### `@cisri/json-schema-editor`

- 迁移后回归测试：原有单元测试和组件测试继续通过，re-export 保持兼容。

## 包结构与依赖

### 新增 `@cisri/json-schema-core`

```
packages/json-schema-core/
  package.json
  tsconfig.json
  vite.config.ts
  README.md
  src/
    index.ts
    utils.ts
```

`package.json` 关键项：

```json
{
  "name": "@cisri/json-schema-core",
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
  "scripts": {
    "build": "tsc && vite build",
    "prepublishOnly": "npm run build"
  },
  "publishConfig": { "access": "public" },
  "peerDependencies": {
    "typescript": "^5.4.5"
  },
  "devDependencies": {
    "typescript": "^5.4.5",
    "vite": "^5.2.11"
  }
}
```

`json-schema-core` 无运行时第三方依赖，类型在编译期擦除。

### 新增 `@cisri/json-schema-selector`

```
packages/json-schema-selector/
  package.json
  tsconfig.json
  vite.config.ts
  README.md
  src/
    index.ts
    json-schema-selector.tsx
    ui/
      button.tsx
      dialog.tsx
      input.tsx
      scroll-area.tsx
      separator.tsx
      skeleton.tsx
```

`package.json` 关键项：

```json
{
  "name": "@cisri/json-schema-selector",
  "version": "1.0.0",
  "type": "module",
  "dependencies": {
    "@cisri/core": "workspace:*",
    "@cisri/json-schema-core": "workspace:*"
  },
  "peerDependencies": {
    "react": "^18.0.0 || ^19.0.0",
    "react-dom": "^18.0.0 || ^19.0.0",
    "@radix-ui/react-dialog": "^1.0.0",
    "@radix-ui/react-slot": "^1.0.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.0.0",
    "lucide-react": "^0.300.0",
    "tailwind-merge": "^2.0.0"
  },
  "peerDependenciesMeta": {
    "@radix-ui/react-dialog": { "optional": true },
    "@radix-ui/react-slot": { "optional": true },
    "class-variance-authority": { "optional": true },
    "clsx": { "optional": true },
    "lucide-react": { "optional": true },
    "tailwind-merge": { "optional": true }
  }
}
```

### `@cisri/json-schema-editor` 调整

- `package.json` 新增依赖 `@cisri/json-schema-core`。
- `schema-utils.ts` 删除 `JsonSchemaType`、`JsonSchema`、`generateSampleData` 定义，改为 import。
- `src/index.ts` 继续 re-export `JsonSchema`、`JsonSchemaType`。

## 构建注意事项

- `vite.config.ts` 中需将 `@cisri/core` 与 `@cisri/json-schema-core` 配置为 `external`，避免打包进产物。
- 子路径导入不影响 external 配置，rollup 可通过正则 `/@cisri\/(core|json-schema-core)/` 匹配。

## 影响范围

- 新增：`packages/json-schema-core/`
- 新增：`packages/json-schema-selector/`
- 修改：`packages/json-schema-editor/src/schema-utils.ts`
- 修改：`packages/json-schema-editor/src/index.ts`
- 修改：`packages/json-schema-editor/package.json`
- 可能修改：`pnpm-workspace.yaml`、`apps/docs/src/sections/DemoSection.tsx`（添加 selector 演示）
