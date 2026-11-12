import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible } from "next/font/google";
import type { ReactNode } from "react";
import { Providers } from "./providers";
import "./globals.css";

const atkinson = Atkinson_Hyperlegible({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-atkinson",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "MediControl", template: "%s · MediControl" },
  description: "Registro compartido de medicación para quienes cuidan.",
};

export const viewport: Viewport = {
  themeColor: "#0d5c63",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es-AR">
      <body className={`${atkinson.variable} bg-canvas font-sans text-base text-ink`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
