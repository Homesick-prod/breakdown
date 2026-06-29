import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MentalBreakdown Film Suite",
    short_name: "MentalBreakdown",
    description: "The ultimate shooting schedule & shot list editor for filmmakers.",
    start_url: "/",
    display: "standalone",
    background_color: "#181818",
    theme_color: "#121212ff",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
