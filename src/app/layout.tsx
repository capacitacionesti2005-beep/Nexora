import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nexora | NJ Ingenieria Empresarial",
  description: "Plataforma empresarial inteligente desarrollada por NJ Ingenieria Empresarial.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full bg-slate-50 font-sans">{children}</body>
    </html>
  );
}
