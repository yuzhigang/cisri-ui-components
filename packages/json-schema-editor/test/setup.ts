import '@testing-library/jest-dom/vitest';

// jsdom doesn't implement pointer capture methods used by Radix UI Select.
Element.prototype.setPointerCapture = () => {};
Element.prototype.releasePointerCapture = () => {};
Element.prototype.hasPointerCapture = () => false;
Element.prototype.scrollIntoView = () => {};
