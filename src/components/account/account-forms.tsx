"use client"

import { useLocale, useTranslations } from "next-intl"
import { useState, useTransition } from "react"

import { deleteAddressAction, eraseAccountAction, logoutAction, saveAddressAction, saveDetailsAction } from "@/app/(site)/[locale]/account/actions"
import { FormField } from "@/components/forms/form-field"
import { useCart } from "@/components/shop/cart-provider"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/ui/native-select"
import { notify } from "@/components/ui/toast"

export function SignOutButton() {
  const t = useTranslations("account")
  const locale = useLocale()
  return (
    <form action={() => logoutAction(locale)}>
      <Button type="submit" variant="outline">{t("signOut")}</Button>
    </form>
  )
}

export function ReorderButton({ items }: { items: { productId: number; quantity: number }[] }) {
  const t = useTranslations("account")
  const { add, setOpen } = useCart()
  return (
    <Button variant="outline" onClick={() => { items.forEach((i) => add(i.productId, i.quantity)); notify(t("reordered"), "success"); setOpen(true) }}>
      {t("reorder")}
    </Button>
  )
}

type Addr = { id?: number; label: string; recipientName: string; phone: string; emirate: "dubai" | "abu_dhabi" | "sharjah"; area: string; street: string; building: string; notes: string; isDefault: boolean }
const EMPTY: Addr = { label: "", recipientName: "", phone: "", emirate: "dubai", area: "", street: "", building: "", notes: "", isDefault: false }

export function AddressForm({ initial, onDone }: { initial?: Addr; onDone?: () => void }) {
  const t = useTranslations("account")
  const tf = useTranslations("forms")
  const tc = useTranslations("common")
  const [a, setA] = useState<Addr>(initial ?? EMPTY)
  const [error, setError] = useState(false)
  const [pending, start] = useTransition()
  const set = <K extends keyof Addr>(k: K, v: Addr[K]) => setA((p) => ({ ...p, [k]: v }))
  return (
    <form noValidate className="grid gap-4" onSubmit={(e) => { e.preventDefault(); setError(false); start(async () => { const r = await saveAddressAction(a); if (r.ok) { notify(t("saved"), "success"); if (!initial) setA(EMPTY); onDone?.() } else setError(true) }) }}>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="a-label" label={t("addr.label")}>{(x) => <Input {...x} value={a.label} onChange={(e) => set("label", e.target.value)} placeholder={t("addr.labelPlaceholder")} />}</FormField>
        <FormField id="a-name" label={t("addr.recipient")}>{(x) => <Input {...x} value={a.recipientName} onChange={(e) => set("recipientName", e.target.value)} />}</FormField>
        <FormField id="a-phone" label={tf("phone")}>{(x) => <Input {...x} type="tel" inputMode="tel" dir="ltr" className="text-start" value={a.phone} onChange={(e) => set("phone", e.target.value)} />}</FormField>
        <FormField id="a-emirate" label={tf("emirate")}>
          {(x) => (
            <NativeSelect {...x} value={a.emirate} onChange={(e) => set("emirate", e.target.value as Addr["emirate"])}>
              {(["dubai", "abu_dhabi", "sharjah"] as const).map((v) => <option key={v} value={v}>{tc(`emirates.${v}`)}</option>)}
            </NativeSelect>
          )}
        </FormField>
        <FormField id="a-area" label={t("addr.area")}>{(x) => <Input {...x} value={a.area} onChange={(e) => set("area", e.target.value)} />}</FormField>
        <FormField id="a-building" label={t("addr.building")}>{(x) => <Input {...x} value={a.building} onChange={(e) => set("building", e.target.value)} />}</FormField>
      </div>
      <label className="flex min-h-11 items-center gap-3"><input type="checkbox" className="size-5 accent-[var(--primary)]" checked={a.isDefault} onChange={(e) => set("isDefault", e.target.checked)} />{t("addr.default")}</label>
      {error && <p role="alert" className="text-sm text-destructive">{t("addr.error")}</p>}
      <div><Button type="submit" disabled={pending}>{t("addr.save")}</Button></div>
    </form>
  )
}

export function DeleteAddressButton({ id }: { id: number }) {
  const t = useTranslations("account")
  const [pending, start] = useTransition()
  return (
    <Button variant="ghost" size="sm" disabled={pending} onClick={() => start(async () => { await deleteAddressAction(id) })}>{t("addr.delete")}</Button>
  )
}

export function DetailsForm({ initial }: { initial: { name: string; phone: string; companyName: string; companyTrn: string; marketingConsent: boolean } }) {
  const t = useTranslations("account")
  const tf = useTranslations("forms")
  const [d, setD] = useState(initial)
  const [error, setError] = useState(false)
  const [pending, start] = useTransition()
  return (
    <form noValidate className="grid gap-4" onSubmit={(e) => { e.preventDefault(); setError(false); start(async () => { const r = await saveDetailsAction(d); if (r.ok) notify(t("saved"), "success"); else setError(true) }) }}>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="d-name" label={tf("name")}>{(x) => <Input {...x} autoComplete="name" value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} />}</FormField>
        <FormField id="d-phone" label={tf("phone")}>{(x) => <Input {...x} type="tel" inputMode="tel" autoComplete="tel" dir="ltr" className="text-start" value={d.phone} onChange={(e) => setD({ ...d, phone: e.target.value })} />}</FormField>
        <FormField id="d-company" label={tf("company")} optional optionalLabel={tf("optional")}>{(x) => <Input {...x} autoComplete="organization" value={d.companyName} onChange={(e) => setD({ ...d, companyName: e.target.value })} />}</FormField>
        <FormField id="d-trn" label={tf("trn")} optional optionalLabel={tf("optional")} hint={tf("trnHint")}>{(x) => <Input {...x} inputMode="numeric" maxLength={15} dir="ltr" className="text-start" value={d.companyTrn} onChange={(e) => setD({ ...d, companyTrn: e.target.value.replace(/\D/g, "") })} />}</FormField>
      </div>
      <label className="flex items-start gap-3"><input type="checkbox" className="mt-1 size-5 accent-[var(--primary)]" checked={d.marketingConsent} onChange={(e) => setD({ ...d, marketingConsent: e.target.checked })} />{t("details.marketing")}</label>
      {error && <p role="alert" className="text-sm text-destructive">{t("details.error")}</p>}
      <div><Button type="submit" disabled={pending}>{t("details.save")}</Button></div>
    </form>
  )
}

export function EraseAccount() {
  const t = useTranslations("account")
  const locale = useLocale()
  const [pending, start] = useTransition()
  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button variant="outline" className="border-destructive text-destructive hover:bg-destructive/10" />}>{t("erase.button")}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("erase.title")}</AlertDialogTitle>
          <AlertDialogDescription>{t("erase.body")}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("erase.cancel")}</AlertDialogCancel>
          <AlertDialogAction disabled={pending} onClick={() => start(async () => { const r = await eraseAccountAction(); if (r.ok) window.location.assign(`/${locale}`) })}>{t("erase.confirm")}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
