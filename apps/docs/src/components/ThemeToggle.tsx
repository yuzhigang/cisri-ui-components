import { useEffect, useState } from 'react';
import { Moon, Sun, Waves } from 'lucide-react';

type Theme = 'default' | 'dark' | 'ocean';

const themes: { id: Theme; label: string; icon: typeof Sun }[] = [
  { id: 'default', label: 'Light', icon: Sun },
  { id: 'dark', label: 'Dark', icon: Moon },
  { id: 'ocean', label: 'Ocean', icon: Waves },
];

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'default';
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('dark', 'theme-ocean');
    if (theme === 'dark') root.classList.add('dark');
    if (theme === 'ocean') root.classList.add('theme-ocean');
  }, [theme]);

  return (
    <div className="flex items-center gap-2 rounded-md border border-border bg-card p-1">
      {themes.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => setTheme(id)}
          aria-label={`Switch to ${label} theme`}
          aria-pressed={theme === id}
          className={`flex items-center gap-1.5 rounded-sm px-2.5 py-1.5 text-xs font-medium transition-colors ${
            theme === id
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
          }`}
        >
          <Icon className="h-3.5 w-3.5" />
          {label}
        </button>
      ))}
    </div>
  );
}
