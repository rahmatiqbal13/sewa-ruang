import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "group/badge inline-flex h-6 w-fit shrink-0 items-center justify-center gap-1.5 overflow-hidden rounded-full border px-3 py-1 text-xs font-semibold whitespace-nowrap transition-all duration-200 focus-visible:ring-2 focus-visible:ring-ring/50 [&>svg]:pointer-events-none [&>svg]:size-3.5",
  {
    variants: {
      variant: {
        default: 
          "bg-gradient-to-r from-indigo-500 to-purple-600 text-white border-transparent shadow-sm",
        secondary:
          "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200",
        destructive:
          "bg-red-50 text-red-600 border-red-200 hover:bg-red-100",
        success:
          "bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100",
        warning:
          "bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100",
        info:
          "bg-cyan-50 text-cyan-600 border-cyan-200 hover:bg-cyan-100",
        outline:
          "border-slate-200 text-slate-700 bg-white hover:bg-slate-50",
        ghost:
          "hover:bg-slate-100 hover:text-slate-900 border-transparent",
        link: 
          "text-indigo-600 underline-offset-4 hover:underline border-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  })
}

export { Badge, badgeVariants }
