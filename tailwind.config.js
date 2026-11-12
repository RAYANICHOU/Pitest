/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        navy: { 950: "#0b1220", 900: "#101a2b", 850: "#142238", 800: "#192a42" },
        sky: { 400: "#38bdf8", 500: "#0ea5e9" },
      },
    },
  },
  plugins: [],
};
