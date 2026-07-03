export function ThemingSection() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold tracking-tight">Theming</h2>
      <p className="text-muted-foreground">
        All components use CSS variables. Override the variables in your global CSS or switch
        classes at runtime.
      </p>

      <div className="space-y-2">
        <h3 className="font-semibold">Default variables</h3>
        <pre className="rounded-md bg-muted p-4 text-sm">
          <code>{`:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --card: 0 0% 100%;
  --card-foreground: 222.2 84% 4.9%;
  --primary: 222.2 47.4% 11.2%;
  --primary-foreground: 210 40% 98%;
  --border: 214.3 31.8% 91.4%;
  --radius: 0.5rem;
}`}</code>
        </pre>
      </div>

      <div className="space-y-2">
        <h3 className="font-semibold">How to override</h3>
        <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
          <li>Define your own values for the CSS variables in `:root`.</li>
          <li>Make sure Tailwind scans <code>node_modules/@cisri/*/dist/**/*.{'{js,cjs}'}</code>.</li>
          <li>Pass `className` to any component for one-off tweaks.</li>
        </ol>
      </div>

      <div className="space-y-2">
        <h3 className="font-semibold">Try it</h3>
        <p className="text-sm text-muted-foreground">
          Use the theme toggle in the top-right corner to switch between Light, Dark, and Ocean
          themes. The entire page, including the live demo, updates instantly.
        </p>
      </div>
    </div>
  );
}
