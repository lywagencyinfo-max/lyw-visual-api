import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ContentProvider } from "@/lib/content/useContent";

export const metadata: Metadata = {
  title: "Lift Your Body — Programmes Hyrox & cross-training",
  description:
    "Ta séance du jour, tous les jours : programmes Hyrox et cross-training périodisés sur 12 semaines, avec échauffement RAMP et mobilité à chaque séance.",
  applicationName: "Lift Your Body",
  // iPhone : nom et barre d'état quand l'app est ajoutée à l'écran d'accueil
  appleWebApp: { capable: true, title: "LYB", statusBarStyle: "black" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = { themeColor: "#101013", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <ContentProvider>{children}</ContentProvider>
      </body>
    </html>
  );
}
