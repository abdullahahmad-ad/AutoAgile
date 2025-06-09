import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../../lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-navy-950 text-white hover:bg-navy-900 focus-visible:ring-navy-950 shadow-sm",
        destructive: "bg-coral-500 text-white hover:bg-coral-600 focus-visible:ring-coral-500 shadow-sm",
        outline: "border border-cloud-400 bg-white text-navy-950 hover:bg-cloud-50 hover:border-cloud-500 focus-visible:ring-royal-950 shadow-sm",
        secondary: "bg-cloud-100 text-navy-950 hover:bg-cloud-200 focus-visible:ring-royal-950 shadow-sm",
        ghost: "text-navy-950 hover:bg-cloud-100 focus-visible:ring-royal-950",
        link: "text-royal-950 underline-offset-4 hover:underline hover:text-royal-900 focus-visible:ring-royal-950",
        accent: "bg-royal-950 text-white hover:bg-royal-900 focus-visible:ring-royal-950 shadow-sm",
        success: "bg-forest-900 text-white hover:bg-forest-800 focus-visible:ring-forest-900 shadow-sm",
        warning: "bg-marigold-500 text-white hover:bg-marigold-600 focus-visible:ring-marigold-500 shadow-sm",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants } 