/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        surface: '#faf8fe',
        'surface-bright': '#faf8fe',
        'surface-dim': '#dad9df',
        'surface-container-lowest': '#ffffff',
        'surface-container-low': '#f4f3f8',
        'surface-container': '#eeedf3',
        'surface-container-high': '#e9e7ed',
        'surface-container-highest': '#e3e2e7',
        'on-surface': '#1a1b1f',
        'on-surface-variant': '#414753',
        outline: '#717785',
        'outline-variant': '#c1c6d6',
        primary: '#0059b5',
        'primary-container': '#0071e3',
        'primary-fixed': '#d7e2ff',
        'on-primary': '#ffffff',
        'on-primary-fixed-variant': '#00458f',
        secondary: '#5f5e60',
        tertiary: '#b41c00',
        'tertiary-fixed': '#ffdad3',
        'on-tertiary-fixed': '#3e0400',
        'on-tertiary-fixed-variant': '#8e1400',
        error: '#ba1a1a',
        'error-container': '#ffdad6',
        'apple-blue': '#0071e3',
        'apple-blue-hover': '#0077ed',
        'apple-green': '#107c41',
        'apple-dark': '#1d1d1f',
        'apple-subtle': '#86868b',
        'apple-bg': '#fbfbfd',
        'apple-border': '#e5e5ea',
        'apple-subtle-bg': '#f5f5f7',
        brand: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          900: '#0c4a6e',
        }
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        body: ['"DM Sans"', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      }
    },
  },
  plugins: [],
};
