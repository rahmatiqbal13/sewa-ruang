import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/components/layouts/QueryProvider";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "RentSpace - Sistem Manajemen Peminjaman Ruang & Alat",
  description: "Platform modern untuk pengelolaan dan peminjaman ruang serta peralatan. Efisien, terintegrasi, dan mudah digunakan.",
  keywords: ["sewa ruang", "peminjaman alat", "manajemen aset", "booking ruangan"],
  authors: [{ name: "RentSpace" }],
  openGraph: {
    title: "RentSpace - Sistem Manajemen Peminjaman",
    description: "Platform modern untuk pengelolaan dan peminjaman ruang serta peralatan",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-slate-50">
        <QueryProvider>
          {children}
          <Toaster 
            richColors 
            closeButton 
            position="top-right"
            toastOptions={{
              style: {
                fontFamily: 'Inter, system-ui, sans-serif',
              },
            }}
          />
        </QueryProvider>
      </body>
    </html>
  );
}
