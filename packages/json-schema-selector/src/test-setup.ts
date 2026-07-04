import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// jsdom doesn't implement ResizeObserver used by Radix UI ScrollArea.
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));
