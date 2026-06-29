import type { Config } from 'tailwindcss';
import rootConfig from '../../tailwind.config.ts';

export default {
  darkMode: ['class'],
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
    '../../packages/*/src/**/*.{ts,tsx}',
    '../../packages/*/dist/**/*.{js,cjs}',
  ],
  theme: { extend: rootConfig.theme?.extend ?? rootConfig.theme },
  plugins: [],
} satisfies Config;
