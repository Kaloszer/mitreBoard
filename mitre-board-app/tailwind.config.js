/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class', // Keep dark mode enabled via class
  content: [
    './public/index.html', // Include index.html
    './src/**/*.{js,ts,jsx,tsx}', // Scan all relevant files in src
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    }, // Add extensions later if needed
  },
  // Add the safelist back to ensure dynamic classes are included
  safelist: [
    'bg-gray-100', 'dark:bg-gray-800', 'text-gray-600', 'dark:text-gray-400',
    'bg-yellow-100', 'dark:bg-yellow-900', 'text-yellow-900', 'dark:text-yellow-100',
    'bg-sky-100', 'dark:bg-sky-900', 'text-sky-900', 'dark:text-sky-100',
    'bg-blue-100', 'dark:bg-blue-900', 'text-blue-900', 'dark:text-blue-100',
    'bg-muted', 'text-muted-foreground',
  ],
  plugins: [
    require('tailwindcss-animate') // Re-add the animate plugin if you still use it
  ],
};
