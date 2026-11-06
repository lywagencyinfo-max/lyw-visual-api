import type { MetadataRoute } from "next";

/** Rend l'application installable sur l'écran d'accueil ; elle s'ouvre directement sur la séance du jour. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Lift Your Body",
    short_name: "LYB",
    description: "Ta séance Hyrox & cross-training du jour, avec échauffement et mobilité.",
    lang: "fr",
    start_url: "/app",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#101013",
    theme_color: "#101013",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
