import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vanessa — Agent avis Google & réputation",
  description: "ReputAuto™ — détection des nouveaux avis, analyse de sentiment, brouillons de réponse et alertes de réputation pour votre Google Business Profile.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
