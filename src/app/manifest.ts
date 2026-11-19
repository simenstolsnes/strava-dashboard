import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Training Dashboard",
    short_name: "Training",
    description: "Personal training dashboard built on Strava data",
    start_url: "/",
    display: "standalone",
    background_color: "#0d0d0d",
    theme_color: "#0d0d0d",
    icons: [
      { src: "/pwa-icon?size=192", sizes: "192x192", type: "image/png" },
      { src: "/pwa-icon?size=512", sizes: "512x512", type: "image/png" },
      { src: "/pwa-icon?size=512&maskable=1", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
