# json-schema-form + json-schema-ui-editor 设计

日期：2026-07-06
状态：已与用户对齐设计，待写实施计划

## 背景与目标

需要两个业务组件，配合 `@cisri/json-schema-core` 既有 `JsonSchema` 数据模型，借鉴 [react-jsonschema-form (RJSF)](https://github.com/rjsf-team/react-jsonschema-form) 的 uiSchema 思路：

1. **`@cisri/json-schema-form`**（由现有 `json-editor` stub 改名）：输入 `JsonSchema` + 可选 `uiSchema`，渲染可填写表单，产出 JSON 数据。
2. **`@cisri/json-schema-ui-editor`**（新）：辅助用户在「默认生成的 UI」上逐字段调整（widget/label/help/placeholder/order/hidden/disabled/readonly/classNames），产出可存储的 `uiSchema`。

关键决策（已与用户确认）：
- uiSchema 模型 = **RJSF 核心子集**（约 11 个 `ui:*` key）。
- form v1 特性 = **基础类型 + object/array 嵌套 + enum**。
- ui-editor 交互 = **每字段内联配置**（字段处「配置」按钮 → 弹出面板编辑该字段 ui 属性，实时预览）。
- 包结构 = **新 `@cisri/json-schema-ui-core`** 承载 uiSchema 类型与工具。

## 包结构与依赖图

```
@cisri/json-schema-core        (JsonSchema / JsonSchemaType / generateSampleData)   现有
@cisri/json-schema-ui-core    (UiSchema / UiWidget + 工具)                          新
   └── @cisri/json-schema-form   (由 json-editor 改名)                                改名
        └── @cisri/json-schema-ui-editor                                                新
```

- `@cisri/json-schema-ui-core`：纯类型/工具，无 peerDependencies，无 `@cisri/core` 依赖（同 `json-schema-core`）。
- `@cisri/json-schema-form`：
  - dependencies：`@cisri/core`、`@cisri/json-schema-core`、`@cisri/json-schema-ui-core`、`@cisri/shadcn`
  - peerDependencies：`react`、`react-dom`、`lucide-react`
- `@cisri/json-schema-ui-editor`：
  - dependencies：`@cisri/core`、`@cisri/json-schema-core`、`@cisri/json-schema-ui-core`、`@cisri/json-schema-form`、`@cisri/shadcn`
  - peerDependencies：`react`、`react-dom`、`lucide-react`
- `scripts/build-all.mjs` 已按 workspace 依赖拓扑排序，自动保证 `ui-core → form → ui-editor` 顺序构建。
- 目录：`packages/json-schema-ui-core/`、`packages/json-schema-form/`（改名自 `packages/json-editor/`）、`packages/json-schema-ui-editor/`。各包 `vite.config.ts` externalize dependencies + peerDependencies；`vitest.config.ts` 把 `@cisri/*` workspace 依赖 alias 到各自 `src`。

## @cisri/json-schema-ui-core（uiSchema 模型）

### 类型

```ts
export type UiWidget =
  | 'text' | 'textarea' | 'password' | 'color' | 'date'     // string
  | 'updown' | 'range'                                       // number / integer
  | 'checkbox' | 'radio'                                      // boolean
  | 'select' | 'radio'                                        // enum
  | 'hidden';

export interface UiSchema {
  'ui:widget'?: UiWidget;
  'ui:options'?: Record<string, unknown>;   // widget 专属选项，如 textarea 的 rows、range 的 step
  'ui:label'?: string | false;              // false 表示隐藏 label
  'ui:help'?: string;
  'ui:placeholder'?: string;
  'ui:order'?: string[];                     // object 字段顺序
  'ui:hidden'?: boolean;
  'ui:disabled'?: boolean;
  'ui:readonly'?: boolean;
  'ui:classNames'?: string;
  'ui:autofocus'?: boolean;
  // 嵌套：object 各 property 名 → UiSchema；array 的 'items' → UiSchema
  [property: string]: unknown;
}
```

> 索引签名 `[property: string]: unknown` 用于承载嵌套节点的递归结构（与 RJSF 一致）；`ui:*` 显式键以其窄类型优先。访问嵌套节点时由 `getUiField` 安全取值并 cast。

### 工具（纯函数，单测覆盖）

- `generateDefaultUiSchema(schema: JsonSchema): UiSchema`
  - string → `{ 'ui:widget': 'text' }`；number/integer → `'updown'`；boolean → `'checkbox'`；enum → `'select'`。
  - object → `{ 'ui:order': [...properties 键...], <每个 property>: generateDefaultUiSchema(...) }`。
  - array → `{ items: generateDefaultUiSchema(schema.items) }`。
  - primitive 无 `ui:order`。
  - 这是 ui-editor 的「默认 UI」起点；form 在 `uiSchema` 缺省时也用它。
- `getUiField(uiSchema: UiSchema | undefined, path: string[]): UiSchema | undefined`
  - 按路径（object property 名串联，array 段用 `'items'`）取嵌套节点。
- `setUiField(uiSchema: UiSchema, path: string[], patch: Partial<UiSchema>): UiSchema`
  - 不可变更新：在 `path` 指向节点浅合并 `patch`，返回新 `UiSchema`；`path` 为空时在根合并。

## @cisri/json-schema-form（表单渲染）

### Props

```ts
export interface JsonSchemaFormProps {
  schema: JsonSchema;
  uiSchema?: UiSchema;            // 缺省时用 generateDefaultUiSchema(schema)
  value: unknown;                 // formData
  onChange: (value: unknown) => void;
  onError?: (errors: string[]) => void;
  readOnly?: boolean;
  className?: string;
  renderFieldActions?: (ctx: {
    path: string[];
    uiSchema: UiSchema | undefined;
    schema: JsonSchema;
  }) => React.ReactNode;
}
```

### 渲染模型

- 递归字段渲染器，按 `schema.type` + `ui:widget` 选 widget：
  - string：text（默认）/ textarea / password / color / date
  - number / integer：updown（`<input type="number">`，默认）/ range
  - boolean：checkbox（默认）/ radio
  - enum（`schema.enum`）：select（默认）/ radio
  - 任意类型：hidden
- object：渲染 `properties`，按 `ui:order`（缺省取 properties 键顺序）排序；每个 property 递归。
- array：渲染 items 模板，重复 items 子 schema；提供「新增/删除项」按钮（受控）。
- 应用 ui 提示：`ui:label`（含 `false` 隐藏）/ `ui:help` / `ui:placeholder` / `ui:options` / `ui:hidden`（不渲染）/ `ui:disabled` / `ui:readonly` / `ui:classNames` / `ui:autofocus`。
- 全受控 `value` / `onChange`（RJSF 式，按字段路径更新对象/数组，产生新引用）。
- 校验 v1：仅 `required`（object 必填字段）+ 基础类型可空性；出错经 `onError` 回调传出字符串数组。
- 原子来自 `@cisri/shadcn`：`Input`、`Textarea`、`Checkbox`、`Select`、`Label`（新增到 shadcn）等。

### renderFieldActions 钩子

- 每个字段渲染处，若提供 `renderFieldActions`，在其旁边渲染返回的节点（普通使用留空则不渲染任何额外 UI）。
- `ctx` 提供字段路径、当前 uiSchema 节点、字段 schema，供调用方（ui-editor）注入「配置」按钮等动作。
- 这是 form 与 ui-editor 的唯一集成点，form 本身不感知 ui-editor。

## @cisri/json-schema-ui-editor（uiSchema 编辑器）

### Props

```ts
export interface JsonSchemaUiEditorProps {
  schema: JsonSchema;
  uiSchema: UiSchema;
  onChange: (uiSchema: UiSchema) => void;
  formData?: unknown;             // 可选预览数据
  readOnly?: boolean;
  className?: string;
}
```

### 交互模型（每字段内联配置）

- 用 `JsonSchemaForm` 渲染实时预览：`schema` + 当前 `uiSchema` + 可选 `formData`，并经 `renderFieldActions` 给每个字段注入「配置」按钮（lucide `Settings2` 图标）。
- 点「配置」→ 弹出该字段的 Popover 面板（来自 `@cisri/shadcn` 的 `Popover`，需新增该原子）：
  - `ui:widget` 下拉（按 schema 字段类型给可选 widget 集）
  - `ui:label`（输入；含「隐藏 label」勾选）
  - `ui:help`、`ui:placeholder` 输入
  - `ui:hidden` / `ui:disabled` / `ui:readonly` 开关（`@cisri/shadcn` 的 `Switch`，需新增）
  - `ui:classNames` 输入
  - object 字段额外：`ui:order` 用拖曳调整字段顺序
- 改任一项 → `onChange(setUiField(uiSchema, path, patch))` → uiSchema 更新 → form 预览实时重渲染。
- 只编辑 uiSchema，**不修改 schema**；产出 uiSchema 供使用方存储。

### 依赖

- 复用 `@cisri/json-schema-form` 做预览（不重复实现表单渲染）。
- 复用 `@cisri/json-schema-ui-core` 的 `getUiField`/`setUiField` 做不可变更新。
- 需向 `@cisri/shadcn` 新增原子：`Label`（form 用，Phase 1）、`Popover`、`Switch`（ui-editor 用，Phase 2）。它们引入新的 Radix peer：`@radix-ui/react-label`、`@radix-ui/react-popover`、`@radix-ui/react-switch`，需加入 `@cisri/shadcn` 的 peerDependencies。

## 分阶段实施

- **Phase 1**：
  1. `@cisri/json-schema-ui-core`（类型 + `generateDefaultUiSchema` / `getUiField` / `setUiField` + 单测）。
  2. `@cisri/json-schema-form`（改名自 `json-editor`；实现渲染 + `renderFieldActions` + 单测 + docs demo）。
- **Phase 2**：
  3. 向 `@cisri/shadcn` 补 `Popover` / `Switch` / `Label` 原子（若 Phase 1 未用到则在此补）。
  4. `@cisri/json-schema-ui-editor`（实现内联配置 + 单测 + docs demo，依赖 Phase 1 的 form）。

## 测试

- `json-schema-ui-core`：`generateDefaultUiSchema`（各类型/嵌套/enum）、`getUiField`、`setUiField`（不可变、空路径合并）纯函数单测。
- `json-schema-form`：按类型/widget 渲染字段、应用各 `ui:*` 提示、`ui:order` 排序、受控 `value`/`onChange`（含 object/array 路径更新）、`required` 校验经 `onError`。
- `json-schema-ui-editor`：渲染预览 + 每字段「配置」按钮、点击配置改 widget 经 `onChange` 更新 uiSchema、`ui:order` 调整顺序。
- 测试风格沿用现有：显式 `import { describe, it, expect } from 'vitest'`，`vitest.config.ts` alias `@cisri/*` 到 `src`，jsdom + Radix pointer shim。

## 未纳入 v1（YAGNI，后续可扩展）

- ajv 级完整 JSON Schema 校验（format/pattern/minLength/oneOf/anyOf/if-then-else 等）。
- `ui:field` / `ui:template` 自定义渲染器注入。
- `ui:emptyValue`、`ui:rows`（textarea）等更细的 `ui:options` 约定（v1 仅保留 `ui:options` 透传，不规定键）。
- 条件显隐（schema 的 `if/then/else`、`dependencies`）。
- 多选 enum（`checkboxes` 多选 widget）、文件上传 widget。
- i18n、主题切换、稀疏 uiSchema 存储优化（v1 存全量默认 uiSchema，可后续改为仅存 override）。
- form 的 `live-validate` / `no-html5-validate` 等 RJSF 高级选项。