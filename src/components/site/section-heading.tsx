import { cn } from "@/lib/utils"

export function SectionHeading({ title, body, action, className, as: Tag = "h2" }: { title: string; body?: string | null; action?: React.ReactNode; className?: string; as?: "h1" | "h2" }) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-x-8 gap-y-4", className)}>
      <div className="max-w-[40rem]">
        <Tag className="text-h1">{title}</Tag>
        {body ? <p className="text-lead mt-4 text-muted-foreground">{body}</p> : null}
      </div>
      {action}
    </div>
  )
}
