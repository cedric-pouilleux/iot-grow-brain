/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './app/components/**/*.{js,vue,ts}',
    './app/features/**/*.{js,vue,ts}',
    './app/layouts/**/*.{js,vue,ts}',
    './app/pages/**/*.{js,vue,ts}',
    './app/plugins/**/*.{js,vue,ts}',
    './app/app.vue',
    './app/error.vue',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
