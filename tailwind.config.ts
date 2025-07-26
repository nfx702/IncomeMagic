import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#7469b6',
        secondary: '#fd7676',
        accent: '#64b5f6',
        muted: '#64748b',
      },
      animation: {
        'liquid': 'liquid 10s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        liquid: {
          '0%, 100%': { transform: 'scale(1) rotate(0deg)' },
          '33%': { transform: 'scale(1.05) rotate(1deg)' },
          '66%': { transform: 'scale(0.95) rotate(-1deg)' },
        },
        glow: {
          'from': { boxShadow: '0 0 10px rgba(147, 51, 234, 0.5)' },
          'to': { boxShadow: '0 0 20px rgba(147, 51, 234, 0.8)' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
};
export default config;