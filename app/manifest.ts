import type { MetadataRoute } from "next";
import { headers } from "next/headers";

// Phones only, not tablets: iPad/Android-tablet UAs omit the "Mobile" token,
// and desktop/tablet should stay a plain browser tab, not an installable app.
async function isMobilePhone() {
  const ua = (await headers()).get("user-agent") ?? "";
  return /iPhone|iPod/i.test(ua) || (/Android/i.test(ua) && /Mobile/i.test(ua));
}

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const base = {
    name: "The StartUp OS",
    short_name: "StartupOS",
    description: "Track every rupee that moves — expenses, income, and transfers.",
    start_url: "/",
    background_color: "#0c0e12",
    theme_color: "#0b8577",
  };

  if (!(await isMobilePhone())) {
    // Omitting icons and using "browser" display fails Chrome's install
    // criteria, so desktop/tablet never gets an install prompt.
    return { ...base, display: "browser" };
  }

  return {
    ...base,
    display: "standalone",
    icons: [
      { src: "/pwa-icon/192", sizes: "192x192", type: "image/png" },
      { src: "/pwa-icon/512", sizes: "512x512", type: "image/png" },
      {
        src: "/pwa-icon/512?maskable",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
