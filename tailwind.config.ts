import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#18202a",
        field: "#f7f8f5",
        line: "#d9ded5",
        spruce: "#1e5b4f",
        gold: "#d8a03d",
        rose: "#b94e48"
      }
    }
  },
  plugins: []
};

export default config;
