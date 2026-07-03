# 001-ui-components

本项目目标：基于 shadcn/ui 构建可按业务组件独立安装的 npm 组件库，采用 Peer Dependencies 模式。

**工作前必读：** 任何涉及 Monorepo 结构、组件包拆分、构建配置、peer dependencies、发布流程或文档站点的任务，必须先加载并遵循 skill `ui-components-npm-subpackages`。

## 关键约束

- 每个**业务组件**对应一个独立的 npm 包（如 `@cisri/user-profile-card`、`@cisri/order-form`）。
- 原始 shadcn 组件（Button、Dialog 等）不单独发 npm 包，而是按需内联到各业务组件包的 `src/ui/` 中。
- 公共工具函数（如 `cn`）必须放到 `@cisri/core`，禁止各业务包重复定义。
- 所有底层依赖（Radix UI、tailwind-merge、clsx、cva、lucide-react、React）全部作为 `peerDependencies`，不打包进产物。
- 组件必须完全可被使用者覆盖样式：`className` 扩展点、子组件 `className` 插槽、CSS 变量（`--primary`、`--card` 等），禁止写死具体色值或内联样式。
- 使用 pnpm workspace + 独立版本号管理；发布前必须将 `workspace:*` 替换为真实版本号。
- 项目需包含 `apps/docs/` 演示 + 文档融合站点。

## 参考文档

- [REQUIREMENTS.md](REQUIREMENTS.md) — 完整需求文档
