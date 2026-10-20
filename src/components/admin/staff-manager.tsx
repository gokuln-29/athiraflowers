"use client"

import { useState } from "react"

import { createStaffAction, resetMfaAction, resetPasswordAction, updateStaffAction } from "@/app/(admin)/admin/(app)/staff/actions"
import { Field, Panel } from "@/components/admin/fields"
import { useSave } from "@/components/admin/use-save"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/ui/native-select"
import { formatDate } from "@/lib/format"

export type StaffRow = { id: number; name: string; email: string; role: "owner" | "manager" | "staff"; status: "active" | "disabled"; mfa: boolean; lastLoginAt: string | null; isMe: boolean }
const ROLE_HELP = { owner: "Everything, including staff and settings.", manager: "Catalogue, offers, blog, content and reports.", staff: "Orders, leads, customers and payment links." }

export function StaffManager({ rows }: { rows: StaffRow[] }) {
  const create = useSave()
  const rowSave = useSave()
  const [form, setForm] = useState({ name: "", email: "", role: "staff" as StaffRow["role"] })
  const [secret, setSecret] = useState<{ who: string; password: string } | null>(null)
  return (
    <div className="grid gap-6">
      <Panel title="Add a team member" description="They sign in with a one-time temporary password, choose their own, and set up two-step verification.">
        <form className="grid gap-3 sm:grid-cols-4" noValidate onSubmit={(e) => { e.preventDefault(); create.run(() => createStaffAction(form), { ok: "Account created", onDone: (d) => { setSecret({ who: form.email, password: d.temporaryPassword }); setForm({ name: "", email: "", role: "staff" }) } }) }}>
          <Field label="Name" error={create.err("name")}><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Email" error={create.err("email")}><Input type="email" autoComplete="off" spellCheck={false} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label="Role" hint={ROLE_HELP[form.role]}><NativeSelect value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as StaffRow["role"] })}><option value="staff">Staff</option><option value="manager">Manager</option><option value="owner">Owner</option></NativeSelect></Field>
          <div className="flex items-end"><Button type="submit" disabled={create.pending}>Create account</Button></div>
          {create.error && <p role="alert" className="text-sm text-destructive sm:col-span-4">{create.error}</p>}
        </form>
      </Panel>

      <Panel title="Team">
        {rowSave.error && <p role="alert" className="mb-2 rounded-md bg-destructive/10 p-2 text-sm text-destructive">{rowSave.error}</p>}
        <div className="relative overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground"><tr><th className="py-1 font-medium">Person</th><th className="py-1 font-medium">Role</th><th className="py-1 font-medium">Two-step</th><th className="py-1 font-medium">Last sign-in</th><th className="py-1 font-medium">Status</th><th className="py-1"><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="py-2"><span className="font-medium">{r.name}{r.isMe ? " (you)" : ""}</span><span className="meta block">{r.email}</span></td>
                  <td className="py-2"><NativeSelect aria-label={`Role for ${r.name}`} defaultValue={r.role} disabled={r.isMe || rowSave.pending} className="w-28" onChange={(e) => rowSave.run(() => updateStaffAction({ id: r.id, role: e.target.value as StaffRow["role"], status: r.status }), { ok: "Role updated" })}><option value="staff">Staff</option><option value="manager">Manager</option><option value="owner">Owner</option></NativeSelect></td>
                  <td className="py-2">{r.mfa ? "On" : <span className="text-destructive">Not set up</span>}</td>
                  <td className="py-2">{r.lastLoginAt ? formatDate(r.lastLoginAt, "en", { dateStyle: "medium" }) : "never"}</td>
                  <td className="py-2">{r.status === "active" ? "Active" : <span className="text-muted-foreground">Disabled</span>}</td>
                  <td className="py-2 text-right">
                    {!r.isMe && (
                      <span className="inline-flex flex-wrap justify-end gap-1">
                        <Button size="xs" variant="outline" disabled={rowSave.pending} onClick={() => rowSave.run(() => updateStaffAction({ id: r.id, role: r.role, status: r.status === "active" ? "disabled" : "active" }), { ok: r.status === "active" ? "Disabled" : "Enabled" })}>{r.status === "active" ? "Disable" : "Enable"}</Button>
                        <Button size="xs" variant="outline" disabled={rowSave.pending} onClick={() => rowSave.run(() => resetMfaAction({ id: r.id }), { ok: "Two-step reset. They set it up again at next sign-in." })}>Reset two-step</Button>
                        <Button size="xs" variant="outline" disabled={rowSave.pending} onClick={() => rowSave.run(() => resetPasswordAction({ id: r.id }), { ok: "Password reset", onDone: (d) => setSecret({ who: r.email, password: d.temporaryPassword }) })}>Reset password</Button>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Dialog open={!!secret} onOpenChange={(o) => !o && setSecret(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Temporary password</DialogTitle><DialogDescription>Share this with {secret?.who} through a private channel. It is shown only now and must be changed at first sign-in.</DialogDescription></DialogHeader>
          <input readOnly value={secret?.password ?? ""} aria-label="Temporary password" className="num h-10 rounded-md border bg-muted px-3 font-mono" onFocus={(e) => e.currentTarget.select()} />
          <Button onClick={() => setSecret(null)}>Done</Button>
        </DialogContent>
      </Dialog>
    </div>
  )
}
