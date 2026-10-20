"use server"

import { placeOrder, type PlaceOrderResult as Result } from "@/server/orders/place"

export type PlaceOrderResult = Result extends infer R ? (R extends { ok: true; redirectUrl: string; orderNumber: string } ? { ok: true; redirectUrl: string; orderNumber: string } : R) : never

export async function placeOrderAction(input: unknown): Promise<PlaceOrderResult> {
  return placeOrder(input)
}
