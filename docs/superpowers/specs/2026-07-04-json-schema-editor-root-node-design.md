# JsonSchemaEditor Root 节点设计

## 背景

当前 `JsonSchemaEditor` 的表格视图只渲染 `JsonSchema.properties`，导致：

1. 根节点如果不是 `object`（如 `string[]`），表格视图显示为空。
2. 根节点的 `title`/`description` 没有展示和编辑入口，`title: 'User'` 这类信息无法表达。

本设计引入一个可编辑的 root 节点作为 schema 树的顶层，使编辑器能够支持 object/array/primitive 任意类型的根 schema。

## 目标

- 在 schema 树中显式加入 root 节点。
- root 节点的名称对应 `JsonSchema.title`，描述对应 `JsonSchema.description`。
- root 类型默认可切换，支持 object/array/string/number/integer/boolean。
- 当 root 为 primitive 时，表格只显示 root 一行；切换时清空不再适用的 children。
- 保持现有列标题（名称 / 类型 / 必填 / 描述 / 操作）不变。

## 非目标

- 本次不改列标题文案（如“Schema 标题/名称”）。
- 不引入 JSON Schema 的复杂特性（如 `oneOf`、`anyOf`、`$ref`）。
- 不改动现有 UI 组件库依赖和 Tailwind 配置。

## 数据模型

### `SchemaField` 扩展

复用现有 `SchemaField` 表示 root，新增 `isRoot` 标志：

```ts
interface SchemaField {
  id: string;
  name: string;          // root: title；普通字段/ITEMS: 字段名
  type: JsonSchemaType;
  required: boolean;
  description?: string;
  schema: JsonSchema;
  children: SchemaField[];
  expanded: boolean;
  isArrayItem?: boolean;
  isRoot?: boolean;      // 新增
}
```

- root 的 `required` 永远为 `false`，不可编辑。
- root 的 `isArrayItem` 永远为 `false`。

### 序列化

- `schemaToFields(schema)` 不再只返回 `properties`，而是返回包含 root 的单元素数组。
- `fieldsToSchema([root])` 返回完整 `JsonSchema`，包含 `type`、`title`、`description`，以及根据类型生成的 `properties`/`items`。

示例：

```ts
// 输入
{ type: 'object', title: 'User', properties: { name: { type: 'string' } } }

// 内部 fields
[
  {
    id: 'sf-1',
    name: 'User',          // title
    type: 'object',
    required: false,
    isRoot: true,
    children: [
      { id: 'sf-2', name: 'name', type: 'string', ... }
    ]
  }
]

// 输出
{ type: 'object', title: 'User', properties: { name: { type: 'string' } } }
```

## UI 结构与交互

### root 行特殊规则

root 行固定在表格第一行，行为与普通字段不同：

| 行为 | root | 普通字段 |
|------|------|----------|
| 删除按钮 | 隐藏 | 显示 |
| 新增同级按钮 | 隐藏 | 显示 |
| required 复选框 | 禁用/隐藏 | 可编辑 |
| 名称输入框 | 编辑 `title` | 编辑字段名 |
| 折叠按钮 | 可折叠 children | 可折叠 children |

### 不同 root 类型的展示

- **object**：root 行下展开显示 properties。
- **array**：root 行下展开显示一个 `ITEMS` 行，ITEMS 可再展开它的类型。
- **primitive**：root 行无 children，表格只有 root 一行。

### 视觉区分

给 root 行加一个轻微背景色或顶部边框，例如：

```tsx
className={cn(
  field.isRoot && 'bg-muted/30 font-medium'
)}
```

## 状态管理

### 初始化

```ts
const initialFields = ensureAtLeastOneField(schemaToFields(value));
```

`schemaToFields(value)` 现在总是返回长度为 1 的数组（仅 root）。

### dispatch 行为

现有 `SchemaAction` 不变，按 id 查找的函数都能命中 root：

- `update`：可修改 root 的 `name`（title）、`type`、`description`。`required` 对 root 无效。
- `addSibling`：对 root 无操作。
- `delete`：对 root 无操作。
- `toggleExpand`：对 root 有效。

### 类型切换

- root 切换到 primitive 时，`children` 清空。
- root 切换到 `object` 时，若无 children，生成一个默认空字段。
- root 切换到 `array` 时，children 重置为 `[{ name: 'ITEMS', type: 'string', isArrayItem: true }]`。

### undo/redo

history 保存 `SchemaField[][]`，root 已包含在内，undo/redo 自然覆盖 root 变更。

## 边界情况

1. **空 schema 输入**：传入 `{}` 时，默认生成 `type: 'object'` 的 root，并带一个默认空字段。
2. **root 为 primitive 的 JSON 视图**：JSON 视图可正常编辑，表格视图只显示 root 一行。
3. **root 从 object 切到 array**：清空 properties，生成默认 `ITEMS`。
4. **root 从 array 切到 object**：清空 items，生成默认空字段。
5. **root 名称空**：允许为空，`title` 输出空字符串；UI 显示“未命名”占位。

## 测试重点

- root 的 `title`/`description` 能正确序列化和反序列化。
- root 类型切换时 children 正确重置。
- root 不可删除、不可新增同级。
- 单层 array schema（如 `{ type: 'array', items: { type: 'string' } }`）能正常编辑。
- JSON 视图和表格视图双向同步。

## 影响范围

- `packages/json-schema-editor/src/json-schema-editor.tsx`：核心改造。
- `packages/json-schema-editor/src/json-schema-editor.d.ts`（若存在）：类型定义同步。
- `apps/docs/src/sections/DemoSection.tsx`：示例 schema 无需改动，但展示效果会变化。
