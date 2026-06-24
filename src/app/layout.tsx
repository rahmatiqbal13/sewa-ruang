import type { Metadata, Viewport } from "next";
import { DM_Sans, DM_Mono } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/components/layouts/QueryProvider";
import { Toaster } from "@/components/ui/sonner";
import { getInstitutionProfile } from "@/lib/institution";
import { OnlineStatus } from "@/components/pwa/OnlineStatus";

const dmSans = DM_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
  weight: ["300", "400", "500", "600", "700"],
});

const dmMono = DM_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F9FAFB" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0f19" },
  ],
};

export async function generateMetadata(): Promise<Metadata> {
  const institution = await getInstitutionProfile()

  const title = institution?.name
    ? `${institution.name} - Sistem Manajemen Peminjaman`
    : "Sewa Ruang & Alat USC - Sistem Manajemen Peminjaman"

  const description = institution?.description
    ? `${institution.description} Platform modern untuk pengelolaan dan peminjaman ruang serta peralatan.`
    : "Platform modern untuk pengelolaan dan peminjaman ruang serta peralatan. Efisien, terintegrasi, dan mudah digunakan."

  return {
    title,
    description,
    keywords: ["sewa ruang", "peminjaman alat", "manajemen aset", "booking ruangan", "USC", "UNESA"],
    authors: [{ name: institution?.short_name || institution?.name || "USC" }],
    manifest: "/manifest.json",
    icons: {
      icon: [
        { url: "/icons/icon-72x72.png", sizes: "72x72", type: "image/png" },
        { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      ],
      apple: [
        { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      ],
    },
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: institution?.short_name || "Sewa Ruang",
    },
    openGraph: {
      title: institution?.name || "Sewa Ruang & Alat USC",
      description,
      type: "website",
    },
    other: {
      "mobile-web-app-capable": "yes",
      "apple-mobile-web-app-capable": "yes",
      "application-name": institution?.short_name || "Sewa Ruang",
      "msapplication-TileColor": "#0891B2",
      "msapplication-config": "/icons/browserconfig.xml",
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`${dmSans.variable} ${dmMono.variable} h-full antialiased`} data-scroll-behavior="smooth">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0891B2" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </head>
      <body className="min-h-full flex flex-col bg-background font-sans">
        <QueryProvider>
          <OnlineStatus />
          {children}
          <div aria-live="polite" aria-atomic="false">
            <Toaster
              richColors
              closeButton
              position="top-right"
              toastOptions={{
                style: {
                  fontFamily: "'DM Sans', system-ui, sans-serif",
                },
              }}
            />
          </div>
        </QueryProvider>
      </body>
    </html>
  );
}
