/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#ecfeff",
          100: "#cffafe",
          200: "#a5f3fc",
          300: "#67e8f9",
          400: "#22d3ee",
          500: "#06b6d4",
          600: "#0891b2",
          700: "#0e7490",
          800: "#155e75",
          900: "#164e63",
        },
        panel: {
          900: "#08111f",
          800: "#101b2f",
          700: "#16243a",
        },
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(34,211,238,0.15), 0 20px 60px rgba(8,145,178,0.18)",
      },
      fontFamily: {
        sans: ["Segoe UI", "Helvetica Neue", "Arial", "sans-serif"],
      },
      backgroundImage: {
        "grid-fade":
          "linear-gradient(rgba(34,211,238,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.08) 1px, transparent 1px)",
      },
    },
  },
  plugins: [],
};
