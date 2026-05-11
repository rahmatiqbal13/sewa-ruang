import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/components/layouts/QueryProvider";
import { Toaster } from "@/components/ui/sonner";
import { createClient } from "@supabase/supabase-js";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
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

export async function generateMetadata(): Promise<Metadata> {
  const institution = await getInstitutionMetadata()
  
  const title = institution?.name 
    ? `${institution.name} - Sistem Manajemen Peminjaman`
    : "RentSpace - Sistem Manajemen Peminjaman Ruang & Alat"
    
  const description = institution?.description 
    ? `${institution.description} Platform modern untuk pengelolaan dan peminjaman ruang serta peralatan.`
    : "Platform modern untuk pengelolaan dan peminjaman ruang serta peralatan. Efisien, terintegrasi, dan mudah digunakan."

  return {
    title,
    description,
    keywords: ["sewa ruang", "peminjaman alat", "manajemen aset", "booking ruangan"],
    authors: [{ name: institution?.short_name || institution?.name || "RentSpace" }],
    openGraph: {
      title: institution?.name || "RentSpace",
      description,
      type: "website",
    },
  };
}

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
