import * as React from "react"

import { cn } from "@/lib/utils"

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number
  max?: number
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value, max = 100, ...props }, ref) => {
    const percentage = value != null ? (value / max) * 100 : undefined

    return (
      <div
        ref={ref}
        className={cn(
          "relative h-2 w-full overflow-hidden rounded-full bg-slate-100",
          className
        )}
        {...props}
      >
        <div
          className={cn(
            "h-full w-full flex-1 bg-slate-900 transition-all",
            percentage == null && "animate-pulse"
          )}
          style={{ width: percentage != null ? `${percentage}%` : "100%" }}
        />
      </div>
    )
  }
)
Progress.displayName = "Progress"

export { Progress }
