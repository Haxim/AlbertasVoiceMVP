import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#064b70",
        field: "#f0f8f3",
        line: "#b9dbd3",
        spruce: "#074f74",
        gold: "#ffc72c",
        rose: "#f25583",
        sky: "#5ec9e9",
        grass: "#7bc96f",
        petal: "#f25583",
        cream: "#fff3dc"
      }
    }
  },
  plugins: []
};

export default config;
