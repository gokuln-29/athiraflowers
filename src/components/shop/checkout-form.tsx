"use client"

import { Check, Gift } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { useEffect, useMemo, useRef, useState, useTransition } from "react"

import { checkoutOptionsAction } from "@/app/(site)/[locale]/checkout/actions"
import { placeOrderAction, type PlaceOrderResult } from "@/app/(site)/[locale]/checkout/place-order"
import { FormField } from "@/components/forms/form-field"
import { useCart } from "@/components/shop/cart-provider"
import { OrderSummary } from "@/components/shop/order-summary"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/ui/native-select"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { Link } from "@/i18n/navigation"
import { formatDay, formatMoney } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { CheckoutOptions } from "@/server/checkout/options"

type Zone = { id: number; emirate: "dubai" | "abu_dhabi" | "sharjah"; name: string; feeMinor: number; freeOverMinor: number | null; minOrderMinor: number }
type Props = {
  zones: Zone[]
  defaults: { name: string; email: string; phone: string }
  signedIn: boolean
  substitution: string
}

const PHONE = /^\+?[\d\s()-]{7,20}$/
const EMIRATES = ["dubai", "abu_dhabi", "sharjah"] as const

export function CheckoutForm({ zones, defaults, signedIn, substitution }: Props) {
  const t = useTranslations("checkout")
  const tf = useTranslations("forms")
  const tc = useTranslations("common")
  const tcart = useTranslations("cart")
  const locale = useLocale() as "en" | "ar"
  const { items, hydrated, clear } = useCart()
  const [pending, startTransition] = useTransition()
  const formRef = useRef<HTMLFormElement>(null)

  const [contact, setContact] = useState(defaults)
  const [sameRecipient, setSameRecipient] = useState(true)
  const [recipient, setRecipient] = useState({ name: "", phone: "" })
  const [emirate, setEmirate] = useState<string>("")
  const [zoneChoice, setZoneChoice] = useState<number | null>(null)
  const [address, setAddress] = useState({ area: "", street: "", building: "", notes: "" })
  const [date, setDate] = useState<string | null>(null)
  const [slotId, setSlotId] = useState<number | null>(null)
  const [gift, setGift] = useState({ enabled: false, message: "", from: "", hideSender: false })
  const [corp, setCorp] = useState({ enabled: false, company: "", trn: "", poNumber: "", billingAddress: "" })
  const [couponInput, setCouponInput] = useState("")
  const [coupon, setCoupon] = useState<string | null>(null)
  const [payment, setPayment] = useState<"stripe" | "cod">("stripe")
  const [note, setNote] = useState("")
  const [accept, setAccept] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [settled, setSettled] = useState<{ key: string; options: CheckoutOptions } | null>(null)
  const idempotencyKey = useMemo(() => (typeof crypto !== "undefined" ? crypto.randomUUID() : ""), [])
  const keyRef = useRef(idempotencyKey)

  const zonesForEmirate = zones.filter((z) => z.emirate === emirate)
  // A single zone is chosen automatically; a stale zone from another emirate is dropped.
  const zoneId = zonesForEmirate.length === 1 ? zonesForEmirate[0].id : zonesForEmirate.some((z) => z.id === zoneChoice) ? zoneChoice : null

  // Server-quoted totals and delivery availability: latest wins.
  const optionsKey = JSON.stringify({ items, zoneId, slotId, coupon, email: contact.email })
  const loadingOptions = hydrated && items.length > 0 && settled?.key !== optionsKey
  useEffect(() => {
    if (!hydrated || items.length === 0) return
    let cancelled = false
    const timer = setTimeout(async () => {
      const res = await checkoutOptionsAction({ items, zoneId, slotId, couponCode: coupon, email: /.+@.+\..+/.test(contact.email) ? contact.email : null, locale, withAvailability: true })
      if (cancelled || !res.ok) return
      setSettled({ key: optionsKey, options: res.options })
      // Drop a selected slot that is no longer available.
      const day = res.options.days.find((d) => d.day === date)
      const slot = day?.slots.find((s) => s.id === slotId)
      if (slotId && (!slot || !slot.available)) setSlotId(null)
      if (date && day && !day.anyAvailable) setDate(null)
    }, 200)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [optionsKey, hydrated])

  const options = settled?.options ?? null
  const quote = options?.quote
  const day = options?.days.find((d) => d.day === date)
  const codAllowed = !!options?.payment.cod && !!quote && quote.order.totalMinor <= (options?.payment.codMaxMinor ?? Infinity)
  const stripeAllowed = options?.payment.stripe ?? true
  // If the chosen method is unavailable, fall back to the other one that is.
  const effectivePayment: "stripe" | "cod" = !options ? payment : payment === "cod" && !codAllowed && stripeAllowed ? "stripe" : payment === "stripe" && !stripeAllowed && codAllowed ? "cod" : payment

  const m = (n: number) => formatMoney(n, locale, { compact: true })
  const err = (k: string) => (errors[k] ? t(`errors.${errors[k]}` as "errors.required", { default: t("errors.required") }) : undefined)
  const id = (n: string) => `co-${n}`

  function validate(): Record<string, string> {
    const e: Record<string, string> = {}
    if (contact.name.trim().length < 2) e.name = "name"
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(contact.email)) e.email = "email"
    if (!PHONE.test(contact.phone)) e.phone = "phone"
    if (!sameRecipient) {
      if (recipient.name.trim().length < 2) e.recipientName = "name"
      if (!PHONE.test(recipient.phone)) e.recipientPhone = "phone"
    }
    if (!emirate) e.emirate = "required"
    if (!zoneId) e.zone = "required"
    if (address.area.trim().length < 2) e.area = "required"
    if (address.building.trim().length < 2) e.building = "required"
    if (!date) e.date = "date"
    if (!slotId) e.slot = "slot"
    if (gift.enabled && !gift.message.trim()) e.giftMessage = "required"
    if (corp.enabled) {
      if (corp.company.trim().length < 2) e.company = "required"
      if (!/^\d{15}$/.test(corp.trn)) e.trn = "trn"
    }
    if (!accept) e.accept = "accept"
    return e
  }

  function submit(ev: React.FormEvent) {
    ev.preventDefault()
    setServerError(null)
    const found = validate()
    setErrors(found)
    if (Object.keys(found).length > 0) {
      requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"], [data-invalid-group="true"]')?.focus())
      return
    }
    startTransition(async () => {
      const result: PlaceOrderResult = await placeOrderAction({
        items,
        zoneId,
        slotId,
        deliveryDate: date,
        contact: { name: contact.name, email: contact.email, phone: contact.phone },
        recipient: sameRecipient ? { name: contact.name, phone: contact.phone } : recipient,
        address,
        gift,
        corporate: { enabled: corp.enabled, company: corp.company, trn: corp.trn, poNumber: corp.poNumber, billingAddress: corp.billingAddress },
        couponCode: coupon ?? "",
        paymentMethod: effectivePayment,
        customerNote: note,
        locale,
        idempotencyKey: keyRef.current,
        acceptTerms: accept,
      })
      if (result.ok) {
        clear()
        window.location.assign(result.redirectUrl)
        return
      }
      if (result.fieldErrors) setErrors(result.fieldErrors)
      setServerError(t(`serverErrors.${result.error}` as "serverErrors.failed", { default: t("serverErrors.failed") }))
      window.scrollTo({ top: 0, behavior: "smooth" })
    })
  }

  if (hydrated && items.length === 0) {
    return (
      <div className="grid place-items-center gap-4 bg-surface py-24 text-center" style={{ borderRadius: "var(--radius)" }}>
        <h1 className="text-h1">{tcart("empty")}</h1>
        <p className="text-muted-foreground">{tcart("emptyHint")}</p>
        <Button render={<Link href="/shop" />} size="lg">{tcart("browse")}</Button>
      </div>
    )
  }

  const section = "grid gap-5 border-t pt-8"
  return (
    <form ref={formRef} onSubmit={submit} noValidate className="grid gap-10 lg:grid-cols-12 lg:gap-16">
      <div className="grid content-start gap-10 lg:col-span-7">
        <h1 className="text-h1">{t("title")}</h1>
        {serverError && (
          <p role="alert" className="bg-destructive/10 p-4 text-destructive" style={{ borderRadius: "var(--radius)" }}>{serverError}</p>
        )}

        <fieldset className="grid gap-5">
          <legend className="text-h3 mb-1">{t("contact")}</legend>
          {!signedIn && <p className="text-sm text-muted-foreground">{t("guestNote")} <Link href="/account" className="text-primary underline underline-offset-4">{t("signIn")}</Link></p>}
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField id={id("name")} label={tf("name")} error={err("name")}>
              {(a) => <Input {...a} name="name" autoComplete="name" value={contact.name} onChange={(e) => setContact({ ...contact, name: e.target.value })} />}
            </FormField>
            <FormField id={id("phone")} label={tf("phone")} error={err("phone")} hint={tf("phoneHint")}>
              {(a) => <Input {...a} name="tel" type="tel" autoComplete="tel" inputMode="tel" dir="ltr" className="text-start" value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} />}
            </FormField>
          </div>
          <FormField id={id("email")} label={t("emailLabel")} error={err("email")} hint={t("emailHint")}>
            {(a) => <Input {...a} name="email" type="email" autoComplete="email" inputMode="email" spellCheck={false} value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} />}
          </FormField>
        </fieldset>

        <fieldset className={section}>
          <legend className="text-h3 mb-1 -mt-0.5">{t("deliveryTo")}</legend>
          <label className="flex min-h-11 items-center gap-3">
            <input type="checkbox" className="size-5 accent-[var(--primary)]" checked={sameRecipient} onChange={(e) => setSameRecipient(e.target.checked)} />
            {t("sameRecipient")}
          </label>
          {!sameRecipient && (
            <div className="grid gap-5 sm:grid-cols-2">
              <FormField id={id("rname")} label={t("recipientName")} error={err("recipientName")}>
                {(a) => <Input {...a} autoComplete="off" value={recipient.name} onChange={(e) => setRecipient({ ...recipient, name: e.target.value })} />}
              </FormField>
              <FormField id={id("rphone")} label={t("recipientPhone")} error={err("recipientPhone")} hint={t("recipientPhoneHint")}>
                {(a) => <Input {...a} type="tel" inputMode="tel" autoComplete="off" dir="ltr" className="text-start" value={recipient.phone} onChange={(e) => setRecipient({ ...recipient, phone: e.target.value })} />}
              </FormField>
            </div>
          )}
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField id={id("emirate")} label={t("emirate")} error={err("emirate")}>
              {(a) => (
                <NativeSelect {...a} value={emirate} onChange={(e) => setEmirate(e.target.value)}>
                  <option value="" disabled>{tf("choose")}</option>
                  {EMIRATES.map((e) => <option key={e} value={e}>{tc(`emirates.${e}`)}</option>)}
                </NativeSelect>
              )}
            </FormField>
            <FormField id={id("zone")} label={t("zone")} error={err("zone")}>
              {(a) => (
                <NativeSelect {...a} value={zoneId ?? ""} disabled={!emirate} onChange={(e) => setZoneChoice(e.target.value ? Number(e.target.value) : null)}>
                  <option value="" disabled>{tf("choose")}</option>
                  {zonesForEmirate.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
                </NativeSelect>
              )}
            </FormField>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField id={id("area")} label={t("area")} error={err("area")}>
              {(a) => <Input {...a} autoComplete="address-level2" value={address.area} onChange={(e) => setAddress({ ...address, area: e.target.value })} />}
            </FormField>
            <FormField id={id("building")} label={t("building")} error={err("building")}>
              {(a) => <Input {...a} autoComplete="address-line1" value={address.building} onChange={(e) => setAddress({ ...address, building: e.target.value })} />}
            </FormField>
          </div>
          <FormField id={id("street")} label={t("street")} optional optionalLabel={tf("optional")}>
            {(a) => <Input {...a} autoComplete="address-line2" value={address.street} onChange={(e) => setAddress({ ...address, street: e.target.value })} />}
          </FormField>
          <FormField id={id("notes")} label={t("deliveryNotes")} optional optionalLabel={tf("optional")} hint={t("deliveryNotesHint")}>
            {(a) => <Textarea {...a} rows={2} maxLength={300} value={address.notes} onChange={(e) => setAddress({ ...address, notes: e.target.value })} className="rounded-[var(--radius)] bg-surface" />}
          </FormField>
        </fieldset>

        <fieldset className={section} aria-describedby={errors.date || errors.slot ? id("when-error") : undefined}>
          <legend className="text-h3 mb-1 -mt-0.5">{t("when")}</legend>
          {!quote?.zone ? (
            <p className="text-muted-foreground">{t("whenFirst")}</p>
          ) : (
            <>
              {quote.cart.maxLeadHours >= 24 && <p className="text-sm text-muted-foreground">{t("leadNote", { days: Math.round(quote.cart.maxLeadHours / 24) })}</p>}
              <div role="radiogroup" aria-label={t("date")} data-invalid-group={errors.date ? "true" : undefined} tabIndex={-1} className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2">
                {(options?.days ?? []).map((d) => (
                  <button
                    key={d.day}
                    type="button"
                    role="radio"
                    aria-checked={date === d.day}
                    disabled={!d.anyAvailable}
                    onClick={() => { setDate(d.day); setSlotId(null) }}
                    className={cn("pressable min-h-16 min-w-20 shrink-0 border px-3 py-2 text-center", date === d.day ? "border-foreground bg-foreground text-background" : "border-input bg-surface hover:bg-surface-deep", !d.anyAvailable && "cursor-not-allowed opacity-40 line-through")}
                    style={{ borderRadius: "var(--radius)" }}
                  >
                    <span className="block text-sm">{formatDay(d.day, locale).split(" ")[0]}</span>
                    <span className="tabular block text-lg font-medium">{formatDay(d.day, locale).split(" ").slice(1).join(" ")}</span>
                  </button>
                ))}
              </div>
              {date && day && (
                <div role="radiogroup" aria-label={t("slot")} data-invalid-group={errors.slot ? "true" : undefined} tabIndex={-1} className="grid gap-2">
                  {day.slots.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      role="radio"
                      aria-checked={slotId === s.id}
                      disabled={!s.available}
                      onClick={() => setSlotId(s.id)}
                      className={cn("pressable flex min-h-14 items-center justify-between gap-4 border px-4 py-3 text-start", slotId === s.id ? "border-foreground bg-surface ring-1 ring-foreground" : "border-input hover:bg-surface-deep", !s.available && "cursor-not-allowed opacity-50")}
                      style={{ borderRadius: "var(--radius)" }}
                    >
                      <span>
                        <span className="block font-medium">{s.label}</span>
                        {!s.available && s.reason && <span className="block text-sm text-muted-foreground">{t(`reasons.${s.reason}` as "reasons.cutoff")}</span>}
                      </span>
                      <span className="tabular text-sm text-muted-foreground">{s.extraFeeMinor > 0 ? `+${m(s.extraFeeMinor)}` : t("included")}</span>
                    </button>
                  ))}
                </div>
              )}
              {(errors.date || errors.slot) && <p id={id("when-error")} role="alert" className="text-sm text-destructive">{t(errors.date ? "errors.date" : "errors.slot")}</p>}
            </>
          )}
        </fieldset>

        <fieldset className={section}>
          <legend className="text-h3 mb-1 -mt-0.5">{t("giftTitle")}</legend>
          <label className="flex min-h-11 items-center gap-3">
            <input type="checkbox" className="size-5 accent-[var(--primary)]" checked={gift.enabled} onChange={(e) => setGift({ ...gift, enabled: e.target.checked })} />
            <Gift className="size-4" aria-hidden />
            {t("isGift")}
          </label>
          {gift.enabled && (
            <div className="grid gap-5">
              <FormField id={id("gmsg")} label={t("giftMessage")} error={err("giftMessage")} hint={t("giftMessageHint", { count: gift.message.length })}>
                {(a) => <Textarea {...a} rows={3} maxLength={400} value={gift.message} onChange={(e) => setGift({ ...gift, message: e.target.value })} className="rounded-[var(--radius)] bg-surface" />}
              </FormField>
              <FormField id={id("gfrom")} label={t("giftFrom")} optional optionalLabel={tf("optional")}>
                {(a) => <Input {...a} value={gift.from} onChange={(e) => setGift({ ...gift, from: e.target.value })} />}
              </FormField>
              <label className="flex min-h-11 items-center gap-3">
                <input type="checkbox" className="size-5 accent-[var(--primary)]" checked={gift.hideSender} onChange={(e) => setGift({ ...gift, hideSender: e.target.checked })} />
                {t("hideSender")}
              </label>
            </div>
          )}
        </fieldset>

        <fieldset className={section}>
          <legend className="text-h3 mb-1 -mt-0.5">{t("invoiceTitle")}</legend>
          <label className="flex min-h-11 items-center gap-3">
            <input type="checkbox" className="size-5 accent-[var(--primary)]" checked={corp.enabled} onChange={(e) => setCorp({ ...corp, enabled: e.target.checked })} />
            {t("needInvoice")}
          </label>
          {corp.enabled && (
            <div className="grid gap-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <FormField id={id("company")} label={tf("company")} error={err("company")}>
                  {(a) => <Input {...a} autoComplete="organization" value={corp.company} onChange={(e) => setCorp({ ...corp, company: e.target.value })} />}
                </FormField>
                <FormField id={id("trn")} label={tf("trn")} error={err("trn")} hint={tf("trnHint")}>
                  {(a) => <Input {...a} inputMode="numeric" maxLength={15} dir="ltr" className="text-start" value={corp.trn} onChange={(e) => setCorp({ ...corp, trn: e.target.value.replace(/\D/g, "") })} />}
                </FormField>
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <FormField id={id("po")} label={t("poNumber")} optional optionalLabel={tf("optional")}>
                  {(a) => <Input {...a} autoComplete="off" value={corp.poNumber} onChange={(e) => setCorp({ ...corp, poNumber: e.target.value })} />}
                </FormField>
                <FormField id={id("billing")} label={t("billingAddress")} optional optionalLabel={tf("optional")}>
                  {(a) => <Input {...a} autoComplete="street-address" value={corp.billingAddress} onChange={(e) => setCorp({ ...corp, billingAddress: e.target.value })} />}
                </FormField>
              </div>
            </div>
          )}
        </fieldset>

        <fieldset className={section}>
          <legend className="text-h3 mb-1 -mt-0.5">{t("paymentTitle")}</legend>
          <div role="radiogroup" aria-label={t("paymentTitle")} className="grid gap-2">
            {([["stripe", t("payCard"), t("payCardHint"), stripeAllowed], ["cod", t("payCod"), codAllowed ? t("payCodHint") : t("payCodUnavailable", { max: m(options?.payment.codMaxMinor ?? 0) }), codAllowed]] as const).map(([value, label, hint, enabled]) => (
              <button key={value} type="button" role="radio" aria-checked={effectivePayment === value} disabled={!enabled} onClick={() => setPayment(value)} className={cn("pressable flex min-h-14 items-start gap-3 border px-4 py-3 text-start", effectivePayment === value ? "border-foreground bg-surface ring-1 ring-foreground" : "border-input hover:bg-surface-deep", !enabled && "cursor-not-allowed opacity-50")} style={{ borderRadius: "var(--radius)" }}>
                <span className={cn("mt-1 grid size-5 shrink-0 place-items-center rounded-full border", effectivePayment === value ? "border-foreground bg-foreground text-background" : "border-input")}>{effectivePayment === value && <Check className="size-3" aria-hidden />}</span>
                <span>
                  <span className="block font-medium">{label}</span>
                  <span className="block text-sm text-muted-foreground">{hint}</span>
                </span>
              </button>
            ))}
          </div>
        </fieldset>

        <div className={section}>
          <FormField id={id("note")} label={t("orderNote")} optional optionalLabel={tf("optional")}>
            {(a) => <Textarea {...a} rows={2} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} className="rounded-[var(--radius)] bg-surface" />}
          </FormField>
          <p className="text-sm text-muted-foreground">{substitution}</p>
        </div>
      </div>

      <aside className="lg:col-span-5">
        <div className="grid gap-6 bg-surface p-6 lg:sticky lg:top-24 lg:p-8" style={{ borderRadius: "var(--radius)" }}>
          {quote ? <OrderSummary quote={quote} /> : <p className="text-muted-foreground" aria-busy>{t("loadingSummary")}</p>}

          <div className="grid gap-2">
            <label htmlFor={id("coupon")} className="font-medium">{t("coupon")}</label>
            <div className="flex gap-2">
              <Input id={id("coupon")} value={couponInput} onChange={(e) => setCouponInput(e.target.value.toUpperCase())} autoComplete="off" spellCheck={false} dir="ltr" className="text-start" aria-describedby={id("coupon-status")} />
              <Button type="button" variant="outline" className="h-11" disabled={!couponInput.trim()} onClick={() => setCoupon(couponInput.trim())}>{t("apply")}</Button>
            </div>
            <p id={id("coupon-status")} role="status" className={cn("text-sm", quote?.coupon?.valid ? "text-success" : "text-destructive")}>
              {quote?.coupon ? (quote.coupon.valid ? t("couponApplied", { code: quote.coupon.code }) : t(`couponReasons.${quote.coupon.reason ?? "unknown"}` as "couponReasons.unknown")) : ""}
            </p>
          </div>

          <div className="grid gap-2">
            <label className="flex items-start gap-3">
              <input type="checkbox" className="mt-1 size-5 shrink-0 accent-[var(--primary)]" checked={accept} onChange={(e) => setAccept(e.target.checked)} aria-invalid={!!errors.accept} />
              <span>
                {t("acceptPre")} <Link href="/terms" target="_blank" className="text-primary underline underline-offset-4">{t("terms")}</Link>, <Link href="/delivery" target="_blank" className="text-primary underline underline-offset-4">{t("deliveryPolicy")}</Link> {tc("and")} <Link href="/refund" target="_blank" className="text-primary underline underline-offset-4">{t("refundPolicy")}</Link>.
              </span>
            </label>
            {errors.accept && <p role="alert" className="text-sm text-destructive">{t("errors.accept")}</p>}
          </div>

          <Button type="submit" size="lg" className="w-full" disabled={pending || loadingOptions || !quote || quote.order.hasLineIssues}>
            {pending && <Spinner data-icon="inline-start" />}
            {effectivePayment === "stripe" ? t("placeCard") : t("placeCod")}
            {quote && <span className="tabular">· {m(quote.order.totalMinor)}</span>}
          </Button>
          {quote && quote.order.issues.length > 0 && (
            <ul role="status" className="grid gap-1 text-sm text-destructive">
              {quote.order.issues.map((i) => (
                <li key={i.code}>{t(`orderIssues.${i.code}` as "orderIssues.empty", { amount: "minMinor" in i ? m(i.minMinor) : "" })}</li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </form>
  )
}
