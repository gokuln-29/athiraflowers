import { z } from "zod"

const phone = z.string().trim().regex(/^\+?[\d\s()-]{7,20}$/, "phone")
const text = (max: number) => z.string().trim().max(max)

/** Everything the browser may tell the server about an order. There are no prices in here. */
export const placeOrderSchema = z
  .object({
    items: z.array(z.object({ productId: z.number().int().positive(), quantity: z.number().int().min(1).max(1000) })).min(1).max(40),
    zoneId: z.number().int().positive(),
    slotId: z.number().int().positive(),
    deliveryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    contact: z.object({ name: text(120).min(2), email: z.string().trim().toLowerCase().email().max(254), phone }),
    recipient: z.object({ name: text(120).min(2), phone }),
    address: z.object({ area: text(120).min(2), street: text(160).optional().or(z.literal("")), building: text(160).min(2), notes: text(300).optional().or(z.literal("")) }),
    gift: z.object({ enabled: z.boolean(), message: text(400).optional().or(z.literal("")), from: text(120).optional().or(z.literal("")), hideSender: z.boolean().default(false) }),
    corporate: z.object({
      enabled: z.boolean(),
      company: text(160).optional().or(z.literal("")),
      trn: z.string().trim().optional().or(z.literal("")),
      poNumber: text(60).optional().or(z.literal("")),
      billingAddress: text(300).optional().or(z.literal("")),
    }),
    couponCode: text(40).optional().or(z.literal("")),
    paymentMethod: z.enum(["stripe", "cod"]),
    customerNote: text(500).optional().or(z.literal("")),
    locale: z.enum(["en", "ar"]),
    idempotencyKey: z.string().uuid(),
    acceptTerms: z.literal(true),
  })
  .superRefine((v, ctx) => {
    if (v.corporate.enabled) {
      if (!v.corporate.company || v.corporate.company.length < 2) ctx.addIssue({ code: "custom", path: ["corporate", "company"], message: "company" })
      if (!/^\d{15}$/.test(v.corporate.trn ?? "")) ctx.addIssue({ code: "custom", path: ["corporate", "trn"], message: "trn" })
    }
    if (v.gift.enabled && !v.gift.message) ctx.addIssue({ code: "custom", path: ["gift", "message"], message: "message" })
  })

export type PlaceOrderInput = z.infer<typeof placeOrderSchema>
