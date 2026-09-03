/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        plum: {
          950: "#14090f",
          900: "#1c0e16",
          800: "#2b1522",
          700: "#3f2033",
          600: "#5a2d48",
          500: "#7a3d5e",
        },
        gold: {
          300: "#ecd48a",
          400: "#d4b45a",
          500: "#c9a227",
          600: "#a8861c",
        },
        cream: {
          50: "#fdfbf7",
          100: "#f7f1e8",
          200: "#efe4d2",
        },
        ink: {
          900: "#1c1418",
          700: "#3d3238",
          500: "#6b5e66",
          400: "#8a7d85",
        },
      },
      fontFamily: {
        display: ['"Playfair Display"', "Georgia", "serif"],
        sans: ['"DM Sans"', "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 10px 30px -16px rgba(28, 14, 22, 0.35)",
      },
    },
  },
  plugins: [],
};
