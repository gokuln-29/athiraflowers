"use server"

import { submitLead, type LeadResult } from "@/server/leads/submit"

export async function submitLeadAction(raw: unknown): Promise<LeadResult> {
  return submitLead(raw)
}
