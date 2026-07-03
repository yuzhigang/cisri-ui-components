import { NavLink } from 'react-router-dom';
import { Package, Paintbrush, Play, BookOpen } from 'lucide-react';

const links = [
  { to: '/', label: 'Overview', icon: BookOpen },
  { to: '/install', label: 'Install', icon: Package },
  { to: '/demo', label: 'Live Demo', icon: Play },
  { to: '/theming', label: 'Theming', icon: Paintbrush },
];

export const SIDEBAR_WIDTH_CLASS = 'w-60';

export function Sidebar() {
  return (
    <nav className="fixed left-0 top-0 z-40 flex h-screen w-60 flex-col border-r border-border bg-card p-6">
      <div className="mb-8 flex items-center gap-2 text-lg font-semibold">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
          A
        </span>
        @cisri/ui
      </div>
      <ul className="space-y-2">
        {links.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <NavLink
              to={to}
              end
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                }`
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
