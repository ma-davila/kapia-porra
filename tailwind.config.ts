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
        pitch: "#0b6b3a",
        kapia: "#16a34a",
      },
    },
  },
  plugins: [],
} satisfies Config;
