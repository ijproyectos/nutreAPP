import type { Metadata } from "next";
import { Geist_Mono, Instrument_Sans, Newsreader } from "next/font/google";
import "./globals.css";

// Rediseño visual definitivo (~/Documents/Pantallas/Nuevo/…, "NutrIA
// Sistema de Diseño.dc.html"): Instrument Sans es la tipografía de toda
// la interfaz operable; Newsreader es la voz de marca y aparece poco
// (saludo de Inicio, títulos de página/sección, una cifra por tarjeta).
const instrumentSans = Instrument_Sans({
  variable: "--font-instrument-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "NutrIA",
  description: "Gestión de consultorio para nutricionistas",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${instrumentSans.variable} ${geistMono.variable} ${newsreader.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
