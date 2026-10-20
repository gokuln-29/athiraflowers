import type { OrderStatus } from "@/db/schema"

/** The one authoritative order state machine. */
export const TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["preparing", "cancelled"],
  preparing: ["dispatched", "cancelled"],
  dispatched: ["delivered", "cancelled"],
  delivered: ["refunded"],
  cancelled: ["refunded"],
  refunded: [],
}

export const canTransition = (from: OrderStatus, to: OrderStatus) => TRANSITIONS[from].includes(to)

/** Cancelling before dispatch returns stock to the shelf. */
export const RESTOCK_ON: readonly OrderStatus[] = ["cancelled"]

export const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  preparing: "Preparing",
  dispatched: "Dispatched",
  delivered: "Delivered",
  cancelled: "Cancelled",
  refunded: "Refunded",
}
