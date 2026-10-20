import type { MetadataRoute } from "next"

import { site } from "@/config/site"

export default function manifest(): MetadataRoute.Manifest {
  return { name: site.name, short_name: site.name, start_url: "/en", display: "browser", background_color: "#f1ede7", theme_color: "#8a2b3f", lang: "en" }
}
