'use client'

import { useState } from 'react'
import { ImageIcon } from 'lucide-react'

interface SafeImageProps {
  src: string
  alt: string
  className?: string
  fallbackClassName?: string
}

export function SafeImage({ src, alt, className = '', fallbackClassName = '' }: SafeImageProps) {
  const [error, setError] = useState(false)

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-slate-100 ${fallbackClassName || className}`}>
        <ImageIcon className="h-8 w-8 text-slate-300" />
      </div>
    )
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => { 
        console.error('Failed to load image:', src)
        setError(true)
      }}
    />
  )
}
