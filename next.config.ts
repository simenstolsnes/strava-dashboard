import type { NextConfig } from "next";

// Every page here is personal, live data behind a login, so we render
// dynamically on each request instead of using Cache Components.
const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
