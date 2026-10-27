import type { MetadataRoute } from "next";
import { SITE_NAME } from "@/lib/seo/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: "Athira Flowers",
    description: "Flowers, gifts and plant setups for offices, events and celebrations across the UAE.",
    start_url: "/",
    display: "standalone",
    background_color: "#fafbfa",
    theme_color: "#0e7c5a",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
