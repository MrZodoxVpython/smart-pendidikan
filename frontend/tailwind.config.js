/** Palet: papan tulis hijau tua, kapur kuning, kertas dingin. */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        board: { DEFAULT: '#14352B', 700: '#0E2820', 400: '#2D5A4A', 100: '#DCE8E2' },
        mark: { DEFAULT: '#F0B429', 700: '#B9860E' },
        paper: '#F2F5F3',
        ink: '#17201C',
        muted: '#5B6B64',
        line: '#D6DEDA',
        danger: '#B83A2A',
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', 'system-ui', 'sans-serif'],
        sans: ['"Public Sans"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
