"use client"

import { ArrowLeft, ArrowRight, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useMemo, useState, useTransition } from "react"

import { saveProductAction } from "@/app/(admin)/admin/(app)/products/actions"
import type { MediaItem } from "@/app/(admin)/admin/(app)/media/actions"
import { MediaPicker, Thumb } from "@/components/admin/media-picker"
import { useUnsavedWarning } from "@/components/admin/use-unsaved-warning"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/ui/native-select"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { notify } from "@/components/ui/toast"
import { formatMoney } from "@/lib/format"
import { slugify } from "@/lib/slug"
import type { ProductForm as Values } from "@/server/admin/product-schema"

export type ProductFormInitial = Omit<Values, "imageIds"> & { images: MediaItem[] }

function Field({ label, error, hint, children, className }: { label: string; error?: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`grid gap-1 text-sm ${className ?? ""}`}>
      <span className="font-medium">{label}</span>
      {children}
      {hint && !error && <span className="meta">{hint}</span>}
      {error && <span role="alert" className="text-destructive">{error}</span>}
    </label>
  )
}

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="panel grid gap-4 p-4" aria-label={title}>
      <div>
        <h2 className="text-sm font-semibold">{title}</h2>
        {description && <p className="meta mt-0.5">{description}</p>}
      </div>
      {children}
    </section>
  )
}

export function ProductForm({ initial, categories }: { initial: ProductFormInitial; categories: { id: number; name: string }[] }) {
  const router = useRouter()
  const [v, setV] = useState(initial)
  const [images, setImages] = useState<MediaItem[]>(initial.images)
  useUnsavedWarning(JSON.stringify(v) !== JSON.stringify(initial) || images.map((i) => i.id).join() !== initial.images.map((i) => i.id).join())
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [preview, setPreview] = useState<"en" | "ar">("en")
  const [pending, start] = useTransition()
  const [slugTouched, setSlugTouched] = useState(!!initial.slug)

  const set = <K extends keyof ProductFormInitial>(k: K, val: ProductFormInitial[K]) => setV((p) => ({ ...p, [k]: val }))
  const err = (k: string) => errors[k]?.[0]
  const num = (s: string) => (s === "" ? 0 : Number(s))
  const cardPrice = useMemo(() => (/^\d+(\.\d{1,2})?$/.test(v.price) ? formatMoney(Math.round(Number(v.price) * 100), preview, { compact: true }) : "—"), [v.price, preview])
  const suffix = v.pricingType === "subscription" ? (preview === "ar" ? "لكل توصيلة" : "per delivery") : v.pricingType === "rental" ? (preview === "ar" ? `لمدة ${v.rentalDays ?? ""} أيام` : `for ${v.rentalDays ?? "?"} days`) : ""

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setErrors({})
    setFormError(null)
    start(async () => {
      const { images: _ignored, ...rest } = v
      void _ignored
      const r = await saveProductAction({ ...rest, imageIds: images.map((i) => i.id) })
      if (r.ok) {
        notify("Product saved", "success")
        if (!initial.id) router.replace(`/admin/products/${r.data.id}`)
        else router.refresh()
      } else {
        setFormError(r.error)
        setErrors(r.fieldErrors ?? {})
        requestAnimationFrame(() => document.querySelector<HTMLElement>('[role="alert"]')?.scrollIntoView({ block: "center", behavior: "smooth" }))
      }
    })
  }

  const move = (i: number, d: -1 | 1) => setImages((cur) => { const next = [...cur]; const j = i + d; if (j < 0 || j >= next.length) return cur; [next[i], next[j]] = [next[j], next[i]]; return next })

  return (
    <form onSubmit={submit} noValidate className="grid gap-6 lg:grid-cols-12">
      <div className="grid content-start gap-5 lg:col-span-8">
        {formError && <p role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{formError}</p>}

        <Section title="Basics">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Name (English)" error={err("nameEn")}><Input value={v.nameEn} onChange={(e) => { set("nameEn", e.target.value); if (!slugTouched) set("slug", slugify(e.target.value, "")) }} maxLength={180} /></Field>
            <Field label="Name (Arabic)" error={err("nameAr")}><Input dir="rtl" value={v.nameAr} onChange={(e) => set("nameAr", e.target.value)} maxLength={180} /></Field>
            <Field label="Web address" error={err("slug")} hint="Part of the product URL. Changing it breaks old links."><Input value={v.slug} onChange={(e) => { setSlugTouched(true); set("slug", e.target.value) }} className="num" /></Field>
            <Field label="SKU" error={err("sku")}><Input value={v.sku} onChange={(e) => set("sku", e.target.value)} className="num" /></Field>
            <Field label="Category" error={err("categoryId")}>
              <NativeSelect value={v.categoryId || ""} onChange={(e) => set("categoryId", Number(e.target.value))}>
                <option value="" disabled>Choose…</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </NativeSelect>
            </Field>
            <div className="flex items-end gap-6 pb-1">
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="size-4 accent-[var(--primary)]" checked={v.isActive} onChange={(e) => set("isActive", e.target.checked)} />Visible in the shop</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="size-4 accent-[var(--primary)]" checked={v.isFeatured} onChange={(e) => set("isFeatured", e.target.checked)} />Featured</label>
            </div>
          </div>
        </Section>

        <Section title="Images" description="The first image is the card photo. Use the arrows to reorder. Add alt text in Images.">
          {images.length > 0 && (
            <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {images.map((m, i) => (
                <li key={m.id} className="panel overflow-hidden">
                  <div className="aspect-[4/5]"><Thumb item={m} /></div>
                  <div className="flex items-center justify-between p-1">
                    <span className="flex">
                      <Button type="button" variant="ghost" size="icon-xs" aria-label="Move earlier" disabled={i === 0} onClick={() => move(i, -1)}><ArrowLeft /></Button>
                      <Button type="button" variant="ghost" size="icon-xs" aria-label="Move later" disabled={i === images.length - 1} onClick={() => move(i, 1)}><ArrowRight /></Button>
                    </span>
                    <Button type="button" variant="ghost" size="icon-xs" aria-label="Remove image" onClick={() => setImages((c) => c.filter((x) => x.id !== m.id))}><Trash2 /></Button>
                  </div>
                  {!m.altEn && <p className="px-2 pb-1 text-xs text-destructive">No alt text</p>}
                </li>
              ))}
            </ul>
          )}
          <div><MediaPicker label="Add images" multiple onPick={(picked) => setImages((cur) => [...cur, ...picked.filter((p) => !cur.some((c) => c.id === p.id))])} /></div>
        </Section>

        <Section title="Pricing" description="Prices include 5% VAT. The deposit is refundable and outside VAT.">
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Price (AED)" error={err("price")}><Input inputMode="decimal" value={v.price} onChange={(e) => set("price", e.target.value)} className="num" /></Field>
            <Field label="Compare-at price (AED)" error={err("compareAt")} hint="Optional, shown struck through"><Input inputMode="decimal" value={v.compareAt} onChange={(e) => set("compareAt", e.target.value)} className="num" /></Field>
            <Field label="Vase deposit (AED)" error={err("deposit")} hint="Per unit, refundable"><Input inputMode="decimal" value={v.deposit} onChange={(e) => set("deposit", e.target.value)} className="num" /></Field>
            <Field label="Pricing" error={err("pricingType")}>
              <NativeSelect value={v.pricingType} onChange={(e) => set("pricingType", e.target.value as Values["pricingType"])}>
                <option value="one_time">One-time purchase</option>
                <option value="subscription">Program (priced per delivery)</option>
                <option value="rental">Rental (priced per rental period)</option>
              </NativeSelect>
            </Field>
            {v.pricingType === "subscription" && (
              <Field label="Delivery cadence" error={err("billingInterval")}>
                <NativeSelect value={v.billingInterval ?? ""} onChange={(e) => set("billingInterval", (e.target.value || null) as Values["billingInterval"])}>
                  <option value="">Choose…</option><option value="week">Weekly</option><option value="month">Monthly</option>
                </NativeSelect>
              </Field>
            )}
            {v.pricingType === "rental" && <Field label="Rental period (days)" error={err("rentalDays")}><Input inputMode="numeric" value={v.rentalDays ?? ""} onChange={(e) => set("rentalDays", e.target.value ? num(e.target.value) : null)} className="num" /></Field>}
            <Field label={v.pricingType === "subscription" ? "Minimum deliveries" : "Minimum quantity"} error={err("minQty")}><Input inputMode="numeric" value={v.minQty} onChange={(e) => set("minQty", num(e.target.value))} className="num" /></Field>
            <Field label="Maximum quantity" error={err("maxQty")}><Input inputMode="numeric" value={v.maxQty} onChange={(e) => set("maxQty", num(e.target.value))} className="num" /></Field>
          </div>
        </Section>

        <Section title="Stock and delivery">
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="flex items-center gap-2 text-sm sm:col-span-3"><input type="checkbox" className="size-4 accent-[var(--primary)]" checked={v.trackStock} onChange={(e) => set("trackStock", e.target.checked)} />Track stock (turn off for programs and made-to-order items)</label>
            {v.trackStock && <Field label="Units in stock" error={err("stockQty")} hint="Changes are logged"><Input inputMode="numeric" value={v.stockQty} onChange={(e) => set("stockQty", num(e.target.value))} className="num" /></Field>}
            <Field label="Lead time (hours)" error={err("leadTimeHours")} hint="Minimum notice before delivery"><Input inputMode="numeric" value={v.leadTimeHours} onChange={(e) => set("leadTimeHours", num(e.target.value))} className="num" /></Field>
            <label className="flex items-end gap-2 pb-2 text-sm"><input type="checkbox" className="size-4 accent-[var(--primary)]" checked={v.sameDayEligible} onChange={(e) => set("sameDayEligible", e.target.checked)} />Can be delivered same day</label>
          </div>
        </Section>

        <Section title="Content" description="English and Arabic. Arabic falls back to English when empty. Markdown is supported in the description.">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Short description (English)"><Input value={v.shortEn} onChange={(e) => set("shortEn", e.target.value)} maxLength={300} /></Field>
            <Field label="Short description (Arabic)"><Input dir="rtl" value={v.shortAr} onChange={(e) => set("shortAr", e.target.value)} maxLength={300} /></Field>
            <Field label="Description (English)"><Textarea rows={6} value={v.descriptionEn} onChange={(e) => set("descriptionEn", e.target.value)} /></Field>
            <Field label="Description (Arabic)"><Textarea rows={6} dir="rtl" value={v.descriptionAr} onChange={(e) => set("descriptionAr", e.target.value)} /></Field>
            <Field label="What is included (English)" hint="Comma or one item per line"><Textarea rows={3} value={v.includesEn} onChange={(e) => set("includesEn", e.target.value)} /></Field>
            <Field label="What is included (Arabic)"><Textarea rows={3} dir="rtl" value={v.includesAr} onChange={(e) => set("includesAr", e.target.value)} /></Field>
            <Field label="Care notes (English)"><Textarea rows={3} value={v.careEn} onChange={(e) => set("careEn", e.target.value)} /></Field>
            <Field label="Care notes (Arabic)"><Textarea rows={3} dir="rtl" value={v.careAr} onChange={(e) => set("careAr", e.target.value)} /></Field>
            <Field label="Delivery note (English)"><Textarea rows={2} value={v.deliveryNoteEn} onChange={(e) => set("deliveryNoteEn", e.target.value)} /></Field>
            <Field label="Delivery note (Arabic)"><Textarea rows={2} dir="rtl" value={v.deliveryNoteAr} onChange={(e) => set("deliveryNoteAr", e.target.value)} /></Field>
          </div>
        </Section>

        <Section title="Search appearance" description="Leave empty to use the product name and short description.">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="SEO title (English)" hint={`${v.seoTitleEn.length}/60`}><Input value={v.seoTitleEn} onChange={(e) => set("seoTitleEn", e.target.value)} maxLength={160} /></Field>
            <Field label="SEO title (Arabic)"><Input dir="rtl" value={v.seoTitleAr} onChange={(e) => set("seoTitleAr", e.target.value)} maxLength={160} /></Field>
            <Field label="Meta description (English)" hint={`${v.seoDescriptionEn.length}/155`}><Textarea rows={2} value={v.seoDescriptionEn} onChange={(e) => set("seoDescriptionEn", e.target.value)} maxLength={320} /></Field>
            <Field label="Meta description (Arabic)"><Textarea rows={2} dir="rtl" value={v.seoDescriptionAr} onChange={(e) => set("seoDescriptionAr", e.target.value)} maxLength={320} /></Field>
          </div>
        </Section>

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={pending}>{pending && <Spinner data-icon="inline-start" />}Save product</Button>
          <Button type="button" variant="ghost" onClick={() => router.push("/admin/products")}>Back to products</Button>
        </div>
      </div>

      <aside className="lg:col-span-4">
        <div className="panel sticky top-4 p-4" aria-label="Live preview">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Shop card preview</h2>
            <div className="flex gap-1" role="group" aria-label="Preview language">
              {(["en", "ar"] as const).map((l) => <Button key={l} type="button" size="xs" variant={preview === l ? "default" : "outline"} onClick={() => setPreview(l)} aria-pressed={preview === l}>{l.toUpperCase()}</Button>)}
            </div>
          </div>
          <article dir={preview === "ar" ? "rtl" : "ltr"} className="mx-auto max-w-[240px] bg-[var(--background)] p-3">
            <div className="aspect-[4/5] overflow-hidden rounded-sm bg-[var(--surface-deep)]">{images[0] ? <Thumb item={images[0]} size={480} /> : <div className="grid size-full place-items-center text-xs text-muted-foreground">No image yet</div>}</div>
            <h3 className="mt-3 font-display text-lg leading-snug">{(preview === "ar" ? v.nameAr || v.nameEn : v.nameEn) || "Product name"}</h3>
            <p className="mt-1 text-sm"><span className="num font-medium">{cardPrice}</span> {suffix && <span className="text-muted-foreground">{suffix}</span>}</p>
            {v.trackStock && v.stockQty === 0 && <p className="mt-1 text-xs text-destructive">Sold out</p>}
          </article>
          <p className="meta mt-3">The real page is at /{preview}/product/{v.slug || "…"}.</p>
        </div>
      </aside>
    </form>
  )
}
