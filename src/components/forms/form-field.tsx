import { cn } from "@/lib/utils"

/** Label + control + hint + error, wired with aria-describedby. */
export function FormField({
  id, label, error, hint, optional, optionalLabel, className, children,
}: {
  id: string
  label: string
  error?: string
  hint?: string
  optional?: boolean
  optionalLabel?: string
  className?: string
  children: (aria: { id: string; "aria-invalid": boolean; "aria-describedby"?: string }) => React.ReactNode
}) {
  const describedBy = [error ? `${id}-error` : null, hint ? `${id}-hint` : null].filter(Boolean).join(" ") || undefined
  return (
    <div className={cn("grid gap-1.5", className)} data-invalid={error ? "" : undefined}>
      <label htmlFor={id} className="font-medium">
        {label}
        {optional && optionalLabel ? <span className="ms-2 text-sm font-normal text-muted-foreground">{optionalLabel}</span> : null}
      </label>
      {children({ id, "aria-invalid": !!error, "aria-describedby": describedBy })}
      {hint && !error ? (
        <p id={`${id}-hint`} className="text-sm text-muted-foreground">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  )
}
