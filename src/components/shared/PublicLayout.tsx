import { createClient } from '@supabase/supabase-js'
import { Building2, Phone, Mail, MapPin } from 'lucide-react'
import Link from 'next/link'
import { SafeImage } from '@/components/shared/SafeImage'
import { CreditFooter } from '@/components/shared/CreditFooter'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// Server-side fetch institution profile
async function getInstitutionProfile() {
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
      .select('*')
      .single()
    
    if (error || !data) {
      return null
    }
    
    return data
  } catch (error) {
    console.error('Error fetching institution profile:', error)
    return null
  }
}

interface PublicHeaderProps {
  showAuth?: boolean
}

export async function PublicHeader({ showAuth = true }: PublicHeaderProps) {
  const institution = await getInstitutionProfile()
  
  return (
    <header className="bg-card border-b border-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo & Name */}
        <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          {institution?.logo_url ? (
            <SafeImage
              src={institution.logo_url}
              alt={institution.name}
              className="h-10 w-auto"
              fallback={
                <div className="h-10 w-10 bg-blue-950 rounded-[10px] flex items-center justify-center">
                  <Building2 className="h-6 w-6 text-white" />
                </div>
              }
            />
          ) : (
            <div className="h-10 w-10 bg-blue-950 rounded-[10px] flex items-center justify-center">
              <Building2 className="h-6 w-6 text-white" />
            </div>
          )}
          <div className="hidden sm:block">
            <h1 className="font-bold text-lg text-foreground leading-tight">
              {institution?.name || 'Tim Admin USC'}
            </h1>
            {institution?.short_name && (
              <p className="text-xs text-muted-foreground">{institution.short_name}</p>
            )}
          </div>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-6">
          <Link href="/catalog" className="text-sm font-medium text-muted-foreground hover:text-blue-950 transition-colors">
            Katalog
          </Link>
          <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-blue-950 transition-colors">
            Login
          </Link>
        </nav>

        {/* Auth Buttons */}
        {showAuth && (
          <div className="flex items-center gap-2">
            <Link 
              href="/login" 
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'hidden sm:flex')}
            >
              Masuk
            </Link>
            <Link 
              href="/register" 
              className={cn(buttonVariants({ size: 'sm' }))}
            >
              Daftar
            </Link>
          </div>
        )}
      </div>
    </header>
  )
}

interface PublicFooterProps {
  showContact?: boolean
}

export async function PublicFooter({ showContact = true }: PublicFooterProps) {
  const institution = await getInstitutionProfile()
  
  const currentYear = new Date().getFullYear()
  
  return (
    <footer className="bg-foreground text-muted-foreground">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Institution Info */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              {institution?.logo_url ? (
                <SafeImage
                  src={institution.logo_url}
                  alt={institution.name}
                  className="h-8 w-auto"
                  fallback={
                    <Building2 className="h-6 w-6 text-blue-400" />
                  }
                />
              ) : (
                <Building2 className="h-6 w-6 text-blue-400" />
              )}
              <h3 className="font-bold text-foreground">
                {institution?.name || 'Tim Admin USC'}
              </h3>
            </div>
            {institution?.description && (
              <p className="text-sm text-muted-foreground/70 mb-3">{institution.description}</p>
            )}
          </div>

          {/* Contact Info */}
          {showContact && (
            <div>
              <h4 className="font-semibold text-foreground mb-3">Kontak Kami</h4>
              <div className="space-y-2 text-sm">
                {institution?.address && (
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 mt-0.5 text-blue-400 shrink-0" />
                    <span>{institution.address}</span>
                  </div>
                )}
                {institution?.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-blue-400 shrink-0" />
                    <a href={`tel:${institution.phone}`} className="hover:text-foreground transition-colors">
                      {institution.phone}
                    </a>
                  </div>
                )}
                {institution?.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-blue-400 shrink-0" />
                    <a href={`mailto:${institution.email}`} className="hover:text-foreground transition-colors">
                      {institution.email}
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Operating Hours */}
          <div>
            <h4 className="font-semibold text-foreground mb-3">Jam Operasional</h4>
            {institution?.operating_hours ? (
              <p className="text-sm">{institution.operating_hours}</p>
            ) : (
              <p className="text-sm text-muted-foreground/70">Senin - Jumat: 08:00 - 17:00<br/>Sabtu: 08:00 - 12:00</p>
            )}
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-border/60 mt-8 pt-6 text-center text-sm text-muted-foreground">
          <p>© {currentYear} {institution?.name || 'Tim Admin USC'}. All rights reserved.</p>
          {institution?.website && (
            <a 
              href={institution.website} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 transition-colors"
            >
              {institution.website}
            </a>
          )}
          <CreditFooter />
        </div>
      </div>
    </footer>
  )
}
