/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [require("nativewind/preset")],
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      backgroundImage: {
        'start-screen': "url('/assets/Meeple_black_Vectorizer-AI.svg')", // Note: Background images in NativeWind need standard styling adjustments often, but we will adapt this in App.tsx
      }
    },
  },
  plugins: [],
}
