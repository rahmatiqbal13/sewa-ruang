import type { Metadata, Viewport } from "next";
import { DM_Sans, DM_Mono } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/components/layouts/QueryProvider";
import { Toaster } from "@/components/ui/sonner";
import { createClient } from "@supabase/supabase-js";
import { PWAProvider } from "@/components/providers/PWAProvider";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
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

// Server-side fetch institution profile for metadata
async function getInstitutionMetadata() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !supabaseKey) {
      return null
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
    
    const { data, error } = await supabase
      .from('institution_profile')
      .select('name, short_name, description, website')
      .single()
    
    if (error || !data) {
      return null
    }
    
    return data
  } catch (error) {
    console.error('Error fetching institution metadata:', error)
    return null
  }
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F9FAFB" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0f19" },
  ],
};

export async function generateMetadata(): Promise<Metadata> {
  const institution = await getInstitutionMetadata()
  
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
      "msapplication-TileColor": "#1B3A8C",
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
    <html lang="id" className={`${dmSans.variable} ${dmMono.variable} h-full antialiased`}>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#1B3A8C" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </head>
      <body className="min-h-full flex flex-col bg-background font-sans">
        <PWAProvider>
          <QueryProvider>
            <OnlineStatus />
            {children}
            <InstallPrompt />
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
        </PWAProvider>
      </body>
    </html>
  );
}
