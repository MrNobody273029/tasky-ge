/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: [
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        bg: "#0B0F14",
        glass: "rgba(30,41,59,0.5)",
        stroke: "rgba(30,41,59,0.5)",
        cyan: "#00E5FF",
        magenta: "#FF1CF7",
        violet: "#7C3AED",
        lime: "#C8FF00"
      },
      boxShadow: {
        neon: "0 0 0 1px rgba(0,229,255,0.3), 0 8px 30px rgba(0,229,255,0.08)"
      },
      backdropBlur: {
        xs: '2px'
      }
    }
  },
  plugins: [],
};
