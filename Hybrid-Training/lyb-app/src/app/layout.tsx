import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lift Your Body — Programmes Hyrox & cross-training",
  description:
    "Ta séance du jour, tous les jours : programmes Hyrox et cross-training périodisés sur 12 semaines, avec échauffement RAMP et mobilité à chaque séance.",
};

export const viewport: Viewport = { themeColor: "#101013" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
