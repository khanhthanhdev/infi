/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html"],
  theme: {
    extend: {
      colors: {
        paper: "#FFFFFF",
        "paper-warm": "#FAF9F5",
        ink: "#1A1A18",
        "ink-card": "#26261F",
        muted: "#6B6B60",
        rule: "#E5E7EB",
        "rule-ghost": "#E5E5E0",
        blue: {
          DEFAULT: "#155DFF",
          deep: "#1A4FCC",
          light: "#145BFF",
          tint: "#E8EEFF",
        },
        gold: "#F2C542",
        amber: "#D4A017",
        stance: {
          bullish: "#059669",
          bearish: "#DC2626",
          mixed: "#D97706",
          neutral: "#71717A",
        },
      },
      fontFamily: {
        sans: ['"Inter"', "-apple-system", "BlinkMacSystemFont", "system-ui", "sans-serif"],
        display: ['"Inter Tight"', '"Inter"', "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
      },
      borderRadius: {
        DEFAULT: "0",
        none: "0",
        card: "10px",
        input: "6px",
        badge: "4px",
        pill: "9999px",
      },
    },
  },
  plugins: [],
};
