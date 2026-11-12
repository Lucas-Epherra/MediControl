import type { Config } from "tailwindcss";

// Tokens tomados de la hoja "Sistema de diseño" del canvas de referencia
// (https://claude.ai/artifact/4hw3U5o8vfvEKfrSdYWz28).
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-atkinson)", "system-ui", "sans-serif"],
      },
      fontSize: {
        base: ["18px", "1.45"],
        sm: ["16px", "1.4"],
        card: ["22px", "1.25"],
        h1: ["28px", "1.2"],
        // Resto de la escala de la hoja: nav (barra inferior), h2 (secciones), display (fecha).
        nav: ["15px", "1.3"],
        h2: ["21px", "1.3"],
        display: ["34px", "1.2"],
      },
      colors: {
        ink: "#17282B",
        muted: "#4A5A5D",
        line: "#CBD5D6",
        canvas: "#F3F5F5",
        primary: {
          DEFAULT: "#0D5C63",
          hover: "#0A474D",
          tint: "#E2EFEF",
          ring: "#9CC9CC",
        },
        dada: { DEFAULT: "#1D6B3A", tint: "#E5F2E9" },
        omitida: { DEFAULT: "#475569", tint: "#ECEFF4" },
        ahora: {
          DEFAULT: "#C56A00",
          text: "#6B3500",
          tint: "#FFF2DB",
          badge: "#FFE2AD",
        },
        pendiente: { DEFAULT: "#4A5A5D", tint: "#F3F5F5" },
        atrasada: { DEFAULT: "#B3261E", tint: "#FCEBEA", card: "#FDF1F0", text: "#8C1D17" },
        // Fondo de botón deshabilitado (sección "Botones" de la hoja).
        disabled: "#E3E8E9",
        // Divisor suave dentro de menús y listas.
        "line-soft": "#E3E8E9",
      },
      borderRadius: {
        chip: "10px",
        btn: "12px",
        card: "16px",
        modal: "20px",
      },
      minHeight: {
        touch: "48px",
        action: "56px",
      },
    },
  },
  plugins: [],
};

export default config;
