'use client'

import { useState, useEffect } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { X } from 'lucide-react'

interface MobileBottomSheetProps {
  children: React.ReactNode
  trigger: React.ReactNode
  title?: string
  className?: string
}

export function MobileBottomSheet({ children, trigger, title, className }: MobileBottomSheetProps) {
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger className="md:hidden">
        {trigger}
      </SheetTrigger>
      <SheetContent 
        side="bottom" 
        className={cn(
          "h-[85vh] rounded-t-[20px] px-0 py-0 overflow-hidden",
          className
        )}
      >
        {/* Drag handle */}
        <div className="w-full flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/20" />
        </div>
        
        {title && (
          <SheetHeader className="px-5 pb-3 border-b border-border">
            <SheetTitle className="text-base font-semibold">{title}</SheetTitle>
          </SheetHeader>
        )}
        
        <div className="overflow-y-auto h-[calc(85vh-60px)] px-5 py-4">
          {children}
        </div>
      </SheetContent>
    </Sheet>
  )
}
