import type { Metadata, Viewport } from "next"
import { Instrument_Sans, Newsreader } from "next/font/google"

import { Toaster } from "@/components/ui/toast"
import { TooltipProvider } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

import "../../globals.css"
import "../../admin.css"

const newsreader = Newsreader({ subsets: ["latin"], variable: "--font-newsreader", axes: ["opsz"], display: "swap" })
const instrument = Instrument_Sans({ subsets: ["latin"], variable: "--font-instrument", display: "swap" })

/**
 * Everything is rendered per request: content comes from the database and every response carries a
 * fresh CSP nonce (see src/proxy.ts), which is incompatible with build-time prerendering.
 */
export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s | Admin" },
  robots: { index: false, follow: false, nocache: true },
}
export const viewport: Viewport = { themeColor: "#f4f2ee", width: "device-width", initialScale: 1 }

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr" className={cn(newsreader.variable, instrument.variable)}>
      <body className="admin min-h-svh">
        <TooltipProvider delay={300}>
          <Toaster>{children}</Toaster>
        </TooltipProvider>
      </body>
    </html>
  )
}
