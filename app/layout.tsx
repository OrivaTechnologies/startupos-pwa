import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Lato } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { RegisterServiceWorker } from "@/components/register-service-worker";
import { PointerEventsGuard } from "@/components/pointer-events-guard";
import { BackgroundGlow } from "@/components/background-glow";
import "./globals.css";

// Named --font-sans (not --font-lato) so it lines up with the `--font-sans:
// var(--font-sans)` passthrough in globals.css's @theme inline block — the
// original Geist scaffold used --font-geist-sans there, which meant
// `font-sans` utilities were silently falling back to Tailwind's default
// stack instead of the loaded font.
const lato = Lato({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "700", "900"],
});

// Phones only, not tablets: iPad/Android-tablet UAs omit the "Mobile" token,
// and desktop/tablet should stay a plain browser tab, not an installable app.
async function isMobilePhone() {
  const ua = (await headers()).get("user-agent") ?? "";
  return /iPhone|iPod/i.test(ua) || (/Android/i.test(ua) && /Mobile/i.test(ua));
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "The StartUp OS",
    description: "Track every rupee that moves — expenses, income, and transfers.",
    manifest: "/manifest.webmanifest",
    appleWebApp: (await isMobilePhone())
      ? { capable: true, statusBarStyle: "black-translucent", title: "StartupOS" }
      : { capable: false },
  };
}

export const viewport: Viewport = {
  themeColor: "#12141a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${lato.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <BackgroundGlow />
          {children}
          <Toaster richColors position="top-center" />
          <RegisterServiceWorker />
          <PointerEventsGuard />
        </ThemeProvider>
      </body>
    </html>
  );
}
