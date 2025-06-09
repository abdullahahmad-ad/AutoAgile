import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../../lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-navy-100 text-navy-950 hover:bg-navy-200",
        secondary: "border-transparent bg-cloud-200 text-cloud-800 hover:bg-cloud-300",
        destructive: "border-transparent bg-coral-100 text-coral-900 hover:bg-coral-200",
        outline: "text-navy-950 border-cloud-400",
        success: "border-transparent bg-mint-200 text-forest-900 hover:bg-mint-300",
        warning: "border-transparent bg-marigold-100 text-marigold-900 hover:bg-marigold-200",
        info: "border-transparent bg-sky-300 text-navy-950 hover:bg-sky-400",
        // Jira-specific status badges
        todo: "border-transparent bg-cloud-100 text-cloud-700 hover:bg-cloud-200",
        "in-progress": "border-transparent bg-royal-100 text-royal-950 hover:bg-royal-200",
        "in-review": "border-transparent bg-marigold-100 text-marigold-900 hover:bg-marigold-200",
        done: "border-transparent bg-mint-200 text-forest-900 hover:bg-mint-300",
        // Priority badges
        highest: "border-transparent bg-coral-100 text-coral-900 hover:bg-coral-200",
        high: "border-transparent bg-marigold-100 text-marigold-900 hover:bg-marigold-200",
        medium: "border-transparent bg-royal-100 text-royal-950 hover:bg-royal-200",
        low: "border-transparent bg-forest-100 text-forest-900 hover:bg-forest-200",
        lowest: "border-transparent bg-cloud-100 text-cloud-700 hover:bg-cloud-200",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants } 