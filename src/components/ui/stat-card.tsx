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

const colorConfig: Record<
  Color,
  { borderLeft: string; iconBg: string; iconColor: string }
> = {
  blue: {
    borderLeft: "border-l-[#1B3A8C]",
    iconBg: "bg-[#1B3A8C]/10",
    iconColor: "text-[#1B3A8C]",
  },
  green: {
    borderLeft: "border-l-[#10B981]",
    iconBg: "bg-[#10B981]/10",
    iconColor: "text-[#10B981]",
  },
  orange: {
    borderLeft: "border-l-[#F59E0B]",
    iconBg: "bg-[#F59E0B]/10",
    iconColor: "text-[#F59E0B]",
  },
  red: {
    borderLeft: "border-l-[#EF4444]",
    iconBg: "bg-[#EF4444]/10",
    iconColor: "text-[#EF4444]",
  },
  purple: {
    borderLeft: "border-l-[#8B5CF6]",
    iconBg: "bg-[#8B5CF6]/10",
    iconColor: "text-[#8B5CF6]",
  },
}

export function StatCard({ title, value, subtitle, iconName, color }: StatCardProps) {
  const colors = colorConfig[color]
  const Icon = iconMap[iconName] || CalendarDays

  return (
    <div
      className={cn(
        "rounded-[14px] border border-[#E5E7EB] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)]",
        "border-l-4",
        colors.borderLeft
      )}
    >
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
