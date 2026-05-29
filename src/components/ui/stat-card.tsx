"use client"

import {
  CalendarDays,
  Clock,
  CreditCard,
  Package,
  Building2,
  FileText,
  User,
  TrendingUp,
  Activity,
  Wrench,
  type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"

const iconMap: Record<string, LucideIcon> = {
  "calendar-days": CalendarDays,
  clock: Clock,
  "credit-card": CreditCard,
  package: Package,
  building2: Building2,
  "file-text": FileText,
  user: User,
  "trending-up": TrendingUp,
  activity: Activity,
  wrench: Wrench,
}

type Color = "blue" | "green" | "orange" | "red" | "purple"

interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  iconName: string
  color: Color
}

const colorConfig: Record<Color, { iconBg: string; iconColor: string }> = {
  blue: {
    iconBg: "bg-[#0891B2]/10",
    iconColor: "text-[#0891B2]",
  },
  green: {
    iconBg: "bg-[#10B981]/10",
    iconColor: "text-[#10B981]",
  },
  orange: {
    iconBg: "bg-[#F59E0B]/10",
    iconColor: "text-[#F59E0B]",
  },
  red: {
    iconBg: "bg-[#EF4444]/10",
    iconColor: "text-[#EF4444]",
  },
  purple: {
    iconBg: "bg-[#8B5CF6]/10",
    iconColor: "text-[#8B5CF6]",
  },
}

export function StatCard({ title, value, subtitle, iconName, color }: StatCardProps) {
  const colors = colorConfig[color]
  const Icon = iconMap[iconName] || CalendarDays

  return (
    <div className="rounded-[14px] border border-[#E5E7EB] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
            {subtitle && (
              <p className="mt-1 text-xs text-gray-500">{subtitle}</p>
            )}
          </div>
          <div
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-full",
              colors.iconBg
            )}
          >
            <Icon className={cn("h-5 w-5", colors.iconColor)} />
          </div>
        </div>
      </div>
    </div>
  )
}
