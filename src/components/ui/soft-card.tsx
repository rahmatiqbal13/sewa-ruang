"use client"

import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface SoftCardProps {
  children: ReactNode
  className?: string
}

export function SoftCard({ children, className }: SoftCardProps) {
  return (
    <div
      className={cn(
        "rounded-[14px] border border-[#E5E7EB] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)]",
        className
      )}
    >
      {children}
    </div>
  )
}
