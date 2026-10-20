import { site } from "@/config/site"

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="grid min-h-svh place-items-center px-4 py-10">
      <div className="w-full max-w-sm">
        <p className="mb-8 font-display text-2xl">{site.name}</p>
        <div className="panel p-6">{children}</div>
        <p className="meta mt-4">Staff access only. Activity is logged.</p>
      </div>
    </main>
  )
}
