import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// jsdom doesn't implement pointer capture methods used by Radix UI Select.
Element.prototype.setPointerCapture = () => {};
Element.prototype.releasePointerCapture = () => {};
Element.prototype.hasPointerCapture = () => false;
Element.prototype.scrollIntoView = () => {};

// jsdom doesn't implement ResizeObserver used by Radix UI ScrollArea.
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));
