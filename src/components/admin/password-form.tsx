"use client"

import { useActionState } from "react"

import { changePasswordAction } from "@/app/(admin)/admin/(auth)/account-actions"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"

export function PasswordForm({ forced }: { forced: boolean }) {
  const [state, action, pending] = useActionState(changePasswordAction, undefined)
  return (
    <form action={action} noValidate>
      <FieldGroup>
        <div>
          <h1 className="text-lg font-semibold">{forced ? "Choose a new password" : "Change password"}</h1>
          <p className="meta mt-1">{forced ? "Your password was set by an administrator. Choose your own to continue." : "Other devices are signed out when you change it."}</p>
        </div>
        <Field data-invalid={!!state?.error}>
          <FieldLabel htmlFor="current">Current password</FieldLabel>
          <Input id="current" name="current" type="password" autoComplete="current-password" required className="h-10" />
        </Field>
        <Field data-invalid={!!state?.error}>
          <FieldLabel htmlFor="next">New password</FieldLabel>
          <Input id="next" name="next" type="password" autoComplete="new-password" required minLength={12} className="h-10" aria-describedby="pw-help" />
          {state?.error ? <FieldError>{state.error}</FieldError> : <FieldDescription id="pw-help">At least 12 characters. A passphrase works well.</FieldDescription>}
        </Field>
        <Button type="submit" size="lg" className="h-10 w-full" disabled={pending}>
          {pending && <Spinner data-icon="inline-start" />}
          Save password
        </Button>
      </FieldGroup>
    </form>
  )
}
