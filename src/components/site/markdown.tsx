import ReactMarkdown from "react-markdown"
import rehypeSanitize from "rehype-sanitize"
import remarkGfm from "remark-gfm"

import { cn } from "@/lib/utils"

/** Admin-authored markdown, sanitised (no raw HTML, no scripts, no javascript: URLs). */
export function Markdown({ source, className }: { source: string; className?: string }) {
  return (
    <div className={cn("prose-athira", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSanitize]}
        components={{
          a: ({ href, children }) => (
            <a href={href} className="text-primary underline underline-offset-4 hover:text-primary-hover" rel={href?.startsWith("http") ? "noopener noreferrer" : undefined} target={href?.startsWith("http") ? "_blank" : undefined}>
              {children}
            </a>
          ),
        }}
      >
        {source}
      </ReactMarkdown>
    </div>
  )
}
