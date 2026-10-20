import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button pressable inline-flex shrink-0 items-center justify-center gap-2 rounded-[var(--radius)] border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap outline-none select-none disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 rtl:[&_svg.flip-rtl]:-scale-x-100",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary-hover",
        outline: "border-input bg-transparent text-foreground hover:bg-surface-deep aria-expanded:bg-surface-deep",
        secondary: "bg-secondary text-secondary-foreground hover:bg-[color-mix(in_oklab,var(--secondary),var(--foreground)_8%)]",
        ghost: "hover:bg-surface-deep aria-expanded:bg-surface-deep",
        destructive: "bg-destructive text-white hover:bg-destructive/90",
        link: "text-primary underline underline-offset-4 hover:text-primary-hover",
        night: "bg-night-foreground text-night hover:bg-white",
      },
      size: {
        default: "h-10 px-4",
        xs: "h-7 px-2 text-xs",
        sm: "h-9 px-3",
        lg: "h-12 px-6 text-base",
        icon: "size-10",
        "icon-xs": "size-7",
        "icon-sm": "size-9",
        "icon-lg": "size-12",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      nativeButton={props.nativeButton ?? !props.render}
      // A Button rendered as an anchor is a link for assistive technology, not role="button".
      role={props.role ?? (props.render ? "link" : undefined)}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
