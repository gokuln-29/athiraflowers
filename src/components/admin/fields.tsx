import { cn } from "@/lib/utils"

export function Field({ label, error, hint, children, className }: { label: string; error?: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={cn("grid gap-1 text-sm", className)}>
      <span className="font-medium">{label}</span>
      {children}
      {hint && !error && <span className="meta">{hint}</span>}
      {error && <span role="alert" className="text-destructive">{error}</span>}
    </label>
  )
}

export function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" className="size-4 accent-[var(--primary)]" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  )
}

export function Panel({ title, description, children, actions }: { title: string; description?: string; children: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <section className="panel min-w-0 p-4" aria-label={title}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">{title}</h2>
          {description && <p className="meta mt-0.5 max-w-[70ch]">{description}</p>}
        </div>
        {actions}
      </div>
      {children}
    </section>
  )
}
