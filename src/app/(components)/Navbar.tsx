'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Building2, Menu, X } from 'lucide-react'

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-white border-b border-[#E5E7EB] shadow-sm">
      <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <div className="w-9 h-9 bg-[#2E4DA7] rounded-lg flex items-center justify-center">
            <Building2 className="h-5 w-5 text-white" />
          </div>
          <span className="font-bold text-lg text-[#111827]" style={{ fontFamily: 'DM Sans, sans-serif' }}>
            Sewa Ruang & Alat
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8">
          <Link href="/" className="text-sm font-medium text-[#374151] hover:text-[#2E4DA7] transition-colors">
            Beranda
          </Link>
          <Link href="/catalog" className="text-sm font-medium text-[#374151] hover:text-[#2E4DA7] transition-colors">
            Katalog
          </Link>
          <Link href="#cara" className="text-sm font-medium text-[#374151] hover:text-[#2E4DA7] transition-colors">
            Cara Peminjaman
          </Link>
          <Link href="#kontak" className="text-sm font-medium text-[#374151] hover:text-[#2E4DA7] transition-colors">
            Kontak
          </Link>
        </nav>

        {/* Desktop CTA Buttons */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/login"
            className="px-4 py-2 text-sm font-medium text-[#374151] hover:text-[#2E4DA7] transition-colors"
          >
            Masuk
          </Link>
          <Link
            href="/register"
            className="px-4 py-2 text-sm font-medium text-white bg-[#2E4DA7] rounded-lg hover:bg-[#152d6e] transition-colors"
          >
            Daftar Sekarang
          </Link>
        </div>

        {/* Mobile Menu Toggle */}
        <button
          className="md:hidden p-2 text-[#374151] hover:text-[#2E4DA7]"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-16 left-0 right-0 bg-white border-b border-[#E5E7EB] shadow-lg">
          <nav className="flex flex-col px-4 py-4 space-y-1">
            <Link
              href="/"
              className="px-4 py-3 text-sm font-medium text-[#374151] hover:text-[#2E4DA7] hover:bg-[#F9FAFB] rounded-lg transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              Beranda
            </Link>
            <Link
              href="/catalog"
              className="px-4 py-3 text-sm font-medium text-[#374151] hover:text-[#2E4DA7] hover:bg-[#F9FAFB] rounded-lg transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              Katalog
            </Link>
            <Link
              href="#cara"
              className="px-4 py-3 text-sm font-medium text-[#374151] hover:text-[#2E4DA7] hover:bg-[#F9FAFB] rounded-lg transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              Cara Peminjaman
            </Link>
            <Link
              href="#kontak"
              className="px-4 py-3 text-sm font-medium text-[#374151] hover:text-[#2E4DA7] hover:bg-[#F9FAFB] rounded-lg transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              Kontak
            </Link>
            <div className="pt-4 mt-4 border-t border-[#E5E7EB] space-y-2">
              <Link
                href="/login"
                className="block w-full px-4 py-3 text-sm font-medium text-center text-[#374151] hover:text-[#2E4DA7] hover:bg-[#F9FAFB] rounded-lg transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Masuk
              </Link>
              <Link
                href="/register"
                className="block w-full px-4 py-3 text-sm font-medium text-center text-white bg-[#2E4DA7] rounded-lg hover:bg-[#152d6e] transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Daftar Sekarang
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}
