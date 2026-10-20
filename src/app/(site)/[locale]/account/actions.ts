"use server"

import { and, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"

import { db } from "@/db"
import { customerAddresses, customers, customerSessions } from "@/db/schema"
import { requestLoginCode, verifyLoginCode, type CodeResult } from "@/server/auth/customer-auth"
import { destroyCustomerSession, getCustomer } from "@/server/auth/customer-session"
import { audit } from "@/server/security/audit"

export async function requestCodeAction(input: unknown): Promise<CodeResult> {
  return requestLoginCode(input)
}

export async function verifyCodeAction(input: unknown): Promise<CodeResult> {
  return verifyLoginCode(input)
}

export async function logoutAction(locale: string) {
  await destroyCustomerSession()
  redirect(`/${locale}`)
}

const phone = z.string().trim().regex(/^\+?[\d\s()-]{7,20}$/)
const addressSchema = z.object({
  id: z.number().int().positive().optional(),
  label: z.string().trim().min(1).max(60),
  recipientName: z.string().trim().min(2).max(120),
  phone,
  emirate: z.enum(["dubai", "abu_dhabi", "sharjah"]),
  area: z.string().trim().min(2).max(120),
  street: z.string().trim().max(160).optional().or(z.literal("")),
  building: z.string().trim().min(2).max(160),
  notes: z.string().trim().max(300).optional().or(z.literal("")),
  isDefault: z.boolean().default(false),
})

export type AccountResult = { ok: true } | { ok: false; error: "unauthenticated" | "invalid" | "failed" }

export async function saveAddressAction(input: unknown): Promise<AccountResult> {
  const me = await getCustomer()
  if (!me) return { ok: false, error: "unauthenticated" }
  const parsed = addressSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: "invalid" }
  const { id, ...data } = parsed.data
  try {
    await db.transaction(async (tx) => {
      if (data.isDefault) await tx.update(customerAddresses).set({ isDefault: false }).where(eq(customerAddresses.customerId, me.id))
      if (id) await tx.update(customerAddresses).set({ ...data, street: data.street || null, notes: data.notes || null }).where(and(eq(customerAddresses.id, id), eq(customerAddresses.customerId, me.id)))
      else await tx.insert(customerAddresses).values({ ...data, street: data.street || null, notes: data.notes || null, customerId: me.id })
    })
    revalidatePath("/[locale]/account/addresses", "page")
    return { ok: true }
  } catch {
    return { ok: false, error: "failed" }
  }
}

export async function deleteAddressAction(id: number): Promise<AccountResult> {
  const me = await getCustomer()
  if (!me) return { ok: false, error: "unauthenticated" }
  await db.delete(customerAddresses).where(and(eq(customerAddresses.id, id), eq(customerAddresses.customerId, me.id)))
  revalidatePath("/[locale]/account/addresses", "page")
  return { ok: true }
}

const detailsSchema = z.object({
  name: z.string().trim().max(120).optional().or(z.literal("")),
  phone: phone.optional().or(z.literal("")),
  companyName: z.string().trim().max(160).optional().or(z.literal("")),
  companyTrn: z.string().trim().regex(/^\d{15}$/).optional().or(z.literal("")),
  marketingConsent: z.boolean(),
})

export async function saveDetailsAction(input: unknown): Promise<AccountResult> {
  const me = await getCustomer()
  if (!me) return { ok: false, error: "unauthenticated" }
  const parsed = detailsSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: "invalid" }
  const d = parsed.data
  await db.update(customers).set({ name: d.name || null, phone: d.phone || null, companyName: d.companyName || null, companyTrn: d.companyTrn || null, marketingConsent: d.marketingConsent, marketingConsentAt: d.marketingConsent ? new Date() : null }).where(eq(customers.id, me.id))
  revalidatePath("/[locale]/account/details", "page")
  return { ok: true }
}

/**
 * PDPL erasure. The customer row is anonymised (not deleted) so order/tax records stay consistent;
 * addresses and sessions are removed. Orders keep only what tax law requires.
 */
export async function eraseAccountAction(): Promise<AccountResult> {
  const me = await getCustomer()
  if (!me) return { ok: false, error: "unauthenticated" }
  await db.transaction(async (tx) => {
    await tx.delete(customerAddresses).where(eq(customerAddresses.customerId, me.id))
    await tx.delete(customerSessions).where(eq(customerSessions.customerId, me.id))
    await tx.update(customers).set({ email: `erased-${me.id}@invalid.local`, name: null, phone: null, companyName: null, companyTrn: null, marketingConsent: false, erasedAt: new Date() }).where(eq(customers.id, me.id))
  })
  await audit({ actorType: "customer", actorId: me.id, action: "customer.erased" })
  await destroyCustomerSession()
  return { ok: true }
}
