'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface Rate {
  user_category: string
  rate_per_day: number
  rate_per_hour: number | null
  requires_supervision: boolean
}

interface EquipmentRatesFormProps {
  initialRates?: Rate[]
}

const CATEGORY_LABELS: Record<string, string> = {
  'mahasiswa_s1': 'Mahasiswa Unesa S1',
  'mahasiswa_s2': 'Mahasiswa Unesa S2/Pasca',
  'dosen': 'Dosen Unesa',
  'mou_unesa': 'MoU dengan Unesa',
  'umum': 'Umum'
}

const CATEGORIES = ['mahasiswa_s1', 'mahasiswa_s2', 'dosen', 'mou_unesa', 'umum']

export function EquipmentRatesForm({ initialRates = [] }: EquipmentRatesFormProps) {
  const [rates, setRates] = useState<Record<string, Rate>>(() => {
    const initial: Record<string, Rate> = {}
    initialRates.forEach(rate => {
      initial[rate.user_category] = rate
    })
    return initial
  })

  const updateRate = (category: string, field: keyof Rate, value: any) => {
    setRates(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        user_category: category,
        [field]: value
      }
    }))
  }

  return (
    <div className="space-y-6">
      {CATEGORIES.map(category => {
        const rate = rates[category]
        const hasRate = rate && rate.rate_per_day > 0
        
        return (
          <div key={category} className="border rounded-lg p-4 bg-gray-50/50">
            <h4 className="font-semibold text-gray-800 mb-3">{CATEGORY_LABELS[category]}</h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor={`${category}_day`}>Tarif per Hari (Rp)</Label>
                <Input
                  id={`${category}_day`}
                  name={`${category}_day`}
                  type="number"
                  min="0"
                  placeholder="0"
                  defaultValue={rate?.rate_per_day || ''}
                  onChange={(e) => updateRate(category, 'rate_per_day', parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`${category}_hour`}>Tarif per Jam (Rp)</Label>
                <Input
                  id={`${category}_hour`}
                  name={`${category}_hour`}
                  type="number"
                  min="0"
                  placeholder="Opsional"
                  defaultValue={rate?.rate_per_hour || ''}
                  onChange={(e) => updateRate(category, 'rate_per_hour', parseFloat(e.target.value) || null)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`${category}_supervision`}>Supervisi Laboran</Label>
                <Select 
                  name={`${category}_supervision`}
                  defaultValue={rate?.requires_supervision ? 'true' : 'false'}
                  onValueChange={(value) => updateRate(category, 'requires_supervision', value === 'true')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Ya, Perlu</SelectItem>
                    <SelectItem value="false">Tidak</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
