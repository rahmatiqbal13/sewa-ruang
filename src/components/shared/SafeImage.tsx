'use client'

interface SafeImageProps {
  src: string
  alt: string
  className?: string
}

export function SafeImage({ src, alt, className = '' }: SafeImageProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={className}
      onError={(e) => { 
        (e.target as HTMLImageElement).style.display = 'none'
      }}
    />
  )
}
