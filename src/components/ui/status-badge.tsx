"use client"

import { cn } from "@/lib/utils"

type Status = "pending" | "approved" | "paid" | "completed" | "rejected" | "cancelled"

interface StatusBadgeProps {
  status: Status
}

const statusConfig: Record<
  Status,
  { label: string; className: string }
> = {
  pending: {
    label: "Menunggu Persetujuan",
    className: "bg-[#FEF3C7] text-[#92400E]",
  },
  approved: {
    label: "Disetujui",
    className: "bg-[#DBEAFE] text-[#1E40AF]",
  },
  paid: {
    label: "Lunas",
    className: "bg-[#D1FAE5] text-[#065F46]",
  },
  completed: {
    label: "Selesai",
    className: "bg-[#E5E7EB] text-[#1F2937]",
  },
  rejected: {
    label: "Ditolak",
    className: "bg-[#FEE2E2] text-[#991B1B]",
  },
  cancelled: {
    label: "Dibatalkan",
    className: "bg-[#E5E7EB] text-[#6B7280]",
  },
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status]

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        config.className
      )}
    >
      {config.label}
    </span>
  )
}
