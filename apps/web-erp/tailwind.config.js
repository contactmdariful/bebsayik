import { bebsayikTailwindPreset } from '@bebsayik/ui-tokens';

/** @type {import('tailwindcss').Config} */
export default {
  presets: [bebsayikTailwindPreset],
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    '../../packages/ui-tokens/src/**/*.{js,ts}'
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
