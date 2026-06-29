import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

export function HomeSection() {
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold tracking-tight">@arim/ui</h2>
      <p className="text-lg text-muted-foreground">
        A shadcn/ui-based React business component library. Install only the components you need.
        Keep full control over styling through CSS variables and Tailwind config.
      </p>
      <div className="grid gap-4 sm:grid-cols-3">
        <FeatureCard title="独立安装" description="每个业务组件都是单独的 npm 包，例如 @arim/json-schema-editor。" />
        <FeatureCard title="样式可覆盖" description="组件只使用 CSS 变量，不硬编码颜色，依赖者可完全控制主题。" />
        <FeatureCard title="Peer Dependencies" description="Radix UI、tailwind-merge 等底层依赖复用项目已有实例。" />
      </div>
      <Link
        to="/demo"
        className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        View live demo
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

function FeatureCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h3 className="mb-2 font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
