'use client'

import { useState, ReactNode } from 'react'
import { ImageIcon } from 'lucide-react'

export interface SafeImageProps {
  src: string | null | undefined
  alt: string
  className?: string
  fallbackClassName?: string
  fallback?: ReactNode
}

export function SafeImage({ src, alt, className = '', fallbackClassName = '', fallback }: SafeImageProps) {
  const [error, setError] = useState(false)

  if (error || !src) {
    if (fallback) {
      return <>{fallback}</>
    }
    return (
      <div className={`flex items-center justify-center bg-muted ${fallbackClassName || className}`}>
        <ImageIcon className="h-8 w-8 text-muted-foreground/70" />
      </div>
    )
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
      decoding="async"
      suppressHydrationWarning
      onError={() => {
        console.error('Failed to load image:', src)
        setError(true)
      }}
    />
  )
}
