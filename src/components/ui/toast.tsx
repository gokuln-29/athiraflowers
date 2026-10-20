"use client"

import { Toast as ToastPrimitive } from "@base-ui/react/toast"
import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
  XIcon,
} from "lucide-react"
import * as React from "react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/** Base UI toast (no runtime <style> injection, so it works with a strict nonce-based CSP). */
const toast = ToastPrimitive.createToastManager()

function ToastIcon({ type }: { type: string | undefined }) {
  const icon =
    type === "success" ? (
      <CircleCheckIcon className="text-success" />
    ) : type === "info" ? (
      <InfoIcon />
    ) : type === "warning" ? (
      <TriangleAlertIcon className="text-warn" />
    ) : type === "error" ? (
      <OctagonXIcon className="text-destructive" />
    ) : type === "loading" ? (
      <Loader2Icon className="animate-spin" />
    ) : null
  if (!icon) return null
  return (
    <span
      data-slot="toast-icon"
      aria-hidden
      className="shrink-0 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-5"
    >
      {icon}
    </span>
  )
}

function ToastList({ closeLabel }: { closeLabel: string }) {
  const { toasts } = ToastPrimitive.useToastManager()
  return toasts.map((item) => (
    <ToastPrimitive.Root
      key={item.id}
      toast={item}
      data-slot="toast"
      className={cn(
        "group/toast pointer-events-auto absolute inset-x-0 bottom-0 z-[calc(1000-var(--toast-index))] w-full origin-bottom border bg-popover text-popover-foreground shadow-lg outline-none select-none focus-visible:ring-2 focus-visible:ring-ring",
        "[--gap:0.75rem] [--height:var(--toast-frontmost-height,var(--toast-height))] [--offset-y:calc(var(--toast-offset-y)*-1+calc(var(--toast-index)*var(--gap)*-1)+var(--toast-swipe-movement-y))] [--peek:0.75rem] [--scale:calc(max(0,1-(var(--toast-index)*0.1)))] [--shrink:calc(1-var(--scale))]",
        "h-(--height) [transform:translateX(var(--toast-swipe-movement-x))_translateY(calc(var(--toast-swipe-movement-y)-(var(--toast-index)*var(--peek))-(var(--shrink)*var(--height))))_scale(var(--scale))] [transition:transform_320ms_var(--ease-out-strong),opacity_320ms,height_150ms]",
        "data-expanded:h-(--toast-height) data-expanded:[transform:translateX(var(--toast-swipe-movement-x))_translateY(var(--offset-y))]",
        "data-limited:opacity-0 data-starting-style:[transform:translateY(120%)]",
        "[&[data-ending-style]:not([data-limited]):not([data-swipe-direction])]:[transform:translateY(120%)]"
      )}
      style={{ borderRadius: "var(--radius)" }}
    >
      <ToastPrimitive.Content className="flex h-full items-center gap-3 overflow-hidden p-4 data-behind:opacity-0 data-expanded:opacity-100">
        <ToastIcon type={item.type} />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <ToastPrimitive.Title className="text-sm font-medium" />
          <ToastPrimitive.Description className="text-sm text-muted-foreground" />
        </div>
        <ToastPrimitive.Close
          aria-label={closeLabel}
          render={<Button variant="ghost" size="icon-sm" />}
        >
          <XIcon aria-hidden />
        </ToastPrimitive.Close>
      </ToastPrimitive.Content>
    </ToastPrimitive.Root>
  ))
}

function Toaster({
  children,
  closeLabel = "Close",
  ...props
}: Omit<ToastPrimitive.Provider.Props, "toastManager"> & {
  closeLabel?: string
}) {
  return (
    <ToastPrimitive.Provider toastManager={toast} timeout={4000} {...props}>
      {children}
      <ToastPrimitive.Portal>
        <ToastPrimitive.Viewport className="pointer-events-none fixed inset-x-4 bottom-4 z-[60] mx-auto w-auto max-w-sm outline-none sm:start-auto sm:end-4 sm:mx-0 sm:w-full">
          <ToastList closeLabel={closeLabel} />
        </ToastPrimitive.Viewport>
      </ToastPrimitive.Portal>
    </ToastPrimitive.Provider>
  )
}

/** Fire-and-forget notification. */
function notify(
  title: string,
  type: "success" | "error" | "info" | "warning" = "info",
  description?: string
) {
  toast.add({ title, description, type })
}

export { Toaster, notify, toast }
