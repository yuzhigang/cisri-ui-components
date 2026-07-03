export function InstallSection() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold tracking-tight">Install</h2>
      <p className="text-muted-foreground">
        Install the component package. Peer dependencies must already exist in your project.
      </p>

      <div className="space-y-2">
        <h3 className="font-semibold">Component</h3>
        <pre className="rounded-md bg-muted p-4 text-sm">
          <code>npm install @cisri/json-schema-editor</code>
        </pre>
      </div>

      <div className="space-y-2">
        <h3 className="font-semibold">Peer dependencies</h3>
        <pre className="rounded-md bg-muted p-4 text-sm">
          <code>{`npm install react react-dom @radix-ui/react-collapsible @radix-ui/react-label @radix-ui/react-select @radix-ui/react-slot @radix-ui/react-switch class-variance-authority clsx lucide-react tailwind-merge`}</code>
        </pre>
      </div>

      <div className="space-y-2">
        <h3 className="font-semibold">Tailwind content</h3>
        <p className="text-sm text-muted-foreground">
          Add the dist path to your <code>tailwind.config.ts</code> so utility classes are scanned.
        </p>
        <pre className="rounded-md bg-muted p-4 text-sm">
          <code>{`content: [
  './node_modules/@cisri/*/dist/**/*.{js,cjs}',
]`}</code>
        </pre>
      </div>
    </div>
  );
}
