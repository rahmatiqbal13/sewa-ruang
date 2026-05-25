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
          "bg-primary text-primary-foreground border-transparent",
        secondary:
          "bg-secondary text-secondary-foreground border-border hover:bg-muted",
        destructive:
          "bg-red-600 text-white border-red-700 hover:bg-red-700",
        success:
          "bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-700",
        warning:
          "bg-amber-600 text-white border-amber-700 hover:bg-amber-700",
        info:
          "bg-sky-600 text-white border-sky-700 hover:bg-sky-700",
        outline:
          "border-border text-foreground bg-card hover:bg-muted",
        ghost:
          "hover:bg-muted hover:text-foreground border-transparent",
        link: 
          "text-primary underline-offset-4 hover:underline border-transparent",
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
