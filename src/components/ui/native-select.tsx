import { ChevronDown } from "lucide-react"
import * as React from "react"

import { cn } from "@/lib/utils"

/** Native select: best keyboard, screen-reader and mobile behaviour, styled to match inputs. */
function NativeSelect({ className, children, ...props }: React.ComponentProps<"select">) {
  return (
    <div className="relative">
      <select
        data-slot="native-select"
        className={cn(
          "h-11 w-full appearance-none rounded-[var(--radius)] border border-input bg-surface ps-3 pe-10 text-base outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:opacity-50 aria-invalid:border-destructive",
          className
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown aria-hidden className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  )
}

export { NativeSelect }
