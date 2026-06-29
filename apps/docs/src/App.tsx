import { Routes, Route } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { ThemeToggle } from './components/ThemeToggle';
import { HomeSection } from './sections/HomeSection';
import { InstallSection } from './sections/InstallSection';
import { DemoSection } from './sections/DemoSection';
import { ThemingSection } from './sections/ThemingSection';

export default function App() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="ml-60 flex flex-1 flex-col"> {/* ml-60 must match Sidebar.tsx SIDEBAR_WIDTH_CLASS */}
        <header aria-label="Top navigation" className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/80 px-8 py-4 backdrop-blur">
          <h1 className="text-sm font-medium text-muted-foreground">Business component library</h1>
          <ThemeToggle />
        </header>
        <main className="flex-1 p-8">
          <div className="mx-auto max-w-4xl">
            <Routes>
              <Route path="/" element={<HomeSection />} />
              <Route path="/install" element={<InstallSection />} />
              <Route path="/demo" element={<DemoSection />} />
              <Route path="/theming" element={<ThemingSection />} />
            </Routes>
          </div>
        </main>
      </div>
    </div>
  );
}
