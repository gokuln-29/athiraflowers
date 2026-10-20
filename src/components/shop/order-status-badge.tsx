import { cn } from "@/lib/utils"

const COLORS: Record<string, string> = {
  pending: "text-[var(--stage-pending,#8f6410)]",
  confirmed: "text-[var(--stage-confirmed,#3f5b7a)]",
  preparing: "text-[var(--stage-preparing,#6b4e2e)]",
  dispatched: "text-[var(--stage-dispatched,#2f6b7a)]",
  delivered: "text-[var(--stage-delivered,#2f6b46)]",
  cancelled: "text-[var(--stage-cancelled,#6b645e)]",
  refunded: "text-[var(--stage-refunded,#b3261e)]",
}

/** Status is always text plus a dot, never colour alone. */
export function OrderStatusBadge({ status, label, className }: { status: string; label: string; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-medium", COLORS[status], className)}>
      <span aria-hidden className="inline-block size-2 rounded-full bg-current" />
      {label}
    </span>
  )
}
