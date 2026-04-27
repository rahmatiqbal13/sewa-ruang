"use client"

import { Switch as SwitchPrimitive } from "@base-ui/react/switch"
import { cn } from "@/lib/utils"

interface SwitchProps {
  checked?: boolean
  defaultChecked?: boolean
  onCheckedChange?: (checked: boolean) => void
  disabled?: boolean
  className?: string
  id?: string
}

function Switch({ checked, defaultChecked, onCheckedChange, disabled, className, id }: SwitchProps) {
  return (
    <SwitchPrimitive.Root
      id={id}
      checked={checked}
      defaultChecked={defaultChecked}
      onCheckedChange={onCheckedChange}
      disabled={disabled}
      data-slot="switch"
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors",
        "bg-zinc-200 data-checked:bg-blue-950",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none block h-5 w-5 rounded-full bg-white shadow-sm ring-0 transition-transform",
          "translate-x-0 data-checked:translate-x-5"
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
