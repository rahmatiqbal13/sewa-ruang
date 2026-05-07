'use client'

import { useState } from 'react'
import { ImageUpload } from '@/components/shared/ImageUpload'

interface EquipmentImageUploadProps {
  initialValue?: string
  name?: string
}

export function EquipmentImageUpload({ initialValue = '', name = 'photo_url' }: EquipmentImageUploadProps) {
  const [value, setValue] = useState(initialValue)

  return (
    <div className="space-y-2">
      <ImageUpload 
        bucket="equipment-photos" 
        folder="equipment"
        value={value} 
        onChange={(url) => {
          setValue(url || '')
          // Update hidden input for form submission
          const input = document.querySelector(`input[name="${name}"]`) as HTMLInputElement
          if (input) input.value = url || ''
        }} 
      />
      <input type="hidden" name={name} value={value} />
    </div>
  )
}
