import { notFound } from "next/navigation"

/** Any unmatched path inside a locale renders the localised 404. */
export default function CatchAll() {
  notFound()
}
