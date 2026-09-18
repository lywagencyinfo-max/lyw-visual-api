import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Julie — Agent adhésions & cotisations",
  description: "CotisAuto™ — détection des échéances, relances, suivi des paiements et attestations fiscales pour votre ASBL.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
