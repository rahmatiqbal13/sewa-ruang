'use client'

import { Check, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BookingStepperProps {
  currentStep: number
}

const STEPS = [
  { label: 'Pilih Item' },
  { label: 'Jadwal & Detail' },
  { label: 'Konfirmasi' },
]

export function BookingStepper({ currentStep }: BookingStepperProps) {
  return (
    <div className="flex items-center justify-center gap-1 sm:gap-2">
      {STEPS.map((step, idx) => (
        <div key={step.label} className="flex items-center gap-1 sm:gap-2">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                'w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-medium transition-colors shrink-0',
                currentStep > idx
                  ? 'bg-green-600 text-white'
                  : currentStep === idx
                    ? 'bg-blue-600 text-white'
                    : 'bg-muted text-muted-foreground'
              )}
            >
              {currentStep > idx ? <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : idx + 1}
            </div>
            <span
              className={cn(
                'text-xs sm:text-sm hidden sm:inline',
                currentStep === idx ? 'font-medium text-foreground' : 'text-muted-foreground'
              )}
            >
              {step.label}
            </span>
          </div>
          {idx < STEPS.length - 1 && (
            <ChevronRight
              className={cn(
                'w-4 h-4 shrink-0 hidden sm:block',
                currentStep > idx ? 'text-green-600' : 'text-muted-foreground'
              )}
            />
          )}
        </div>
      ))}
    </div>
  )
}
