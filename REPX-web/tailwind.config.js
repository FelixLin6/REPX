/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#000000",
        border: "#333333",
        accent: "#FFFF00",
        cyan: "#00D9FF",
        text: {
          primary: "#FFFFFF",
          secondary: "#C7C7C7",
        },
      },
      boxShadow: {
        card: "0 10px 40px rgba(0,0,0,0.35)",
      },
    },
  },
  plugins: [],
};
