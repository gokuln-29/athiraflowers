/** wa.me click-to-chat link. Digits only, international format, no leading plus. */
export function whatsappUrl(number: string | undefined, message?: string): string | null {
  const digits = (number ?? "").replace(/\D/g, "")
  if (digits.length < 8) return null
  return `https://wa.me/${digits}${message ? `?text=${encodeURIComponent(message)}` : ""}`
}
