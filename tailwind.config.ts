import type { Config } from "tailwindcss";

export default {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Monochrome theme — black & white.
        pitch: "#0a0a0a", // headings / dark surfaces
        kapia: "#171717", // buttons / accents
      },
    },
  },
  plugins: [],
} satisfies Config;
