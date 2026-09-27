import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Chatbot Manager",
    short_name: "Chatbot AI",
    description: "Dasbor pusat untuk mengelola chatbot AI dan operasional WhatsApp Anda.",
    start_url: "/",
    display: "standalone",
    background_color: "#0f172a",
    theme_color: "#059669",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/icons/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
