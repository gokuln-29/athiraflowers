"use client"

import Link from "next/link"
import { useActionState } from "react"

import { confirmMfaAction, loginAction, verifyMfaAction } from "@/app/(admin)/admin/(auth)/actions"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"

function Submit({ pending, children }: { pending: boolean; children: React.ReactNode }) {
  return (
    <Button type="submit" size="lg" className="h-10 w-full" disabled={pending}>
      {pending && <Spinner data-icon="inline-start" />}
      {children}
    </Button>
  )
}

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, undefined)
  return (
    <form action={action} noValidate>
      <FieldGroup>
        <div>
          <h1 className="text-lg font-semibold">Sign in</h1>
          <p className="meta mt-1">Use your staff email and password.</p>
        </div>
        <Field data-invalid={!!state?.error}>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input id="email" name="email" type="email" autoComplete="username" inputMode="email" spellCheck={false} required autoFocus className="h-10" aria-invalid={!!state?.error} />
        </Field>
        <Field data-invalid={!!state?.error}>
          <FieldLabel htmlFor="password">Password</FieldLabel>
          <Input id="password" name="password" type="password" autoComplete="current-password" required className="h-10" aria-invalid={!!state?.error} aria-describedby={state?.error ? "login-error" : undefined} />
          {state?.error && <FieldError id="login-error">{state.error}</FieldError>}
        </Field>
        <Submit pending={pending}>Continue</Submit>
      </FieldGroup>
    </form>
  )
}

export function VerifyForm() {
  const [state, action, pending] = useActionState(verifyMfaAction, undefined)
  return (
    <form action={action} noValidate>
      <FieldGroup>
        <div>
          <h1 className="text-lg font-semibold">Two-step verification</h1>
          <p className="meta mt-1">Enter the 6-digit code from your authenticator app, or a recovery code.</p>
        </div>
        <Field data-invalid={!!state?.error}>
          <FieldLabel htmlFor="code">Code</FieldLabel>
          <Input id="code" name="code" inputMode="text" autoCapitalize="off" autoComplete="one-time-code" spellCheck={false} required autoFocus maxLength={12} className="h-10 text-base tracking-widest tabular" aria-invalid={!!state?.error} aria-describedby={state?.error ? "code-error" : undefined} />
          {state?.error && <FieldError id="code-error">{state.error}</FieldError>}
        </Field>
        <Submit pending={pending}>Verify</Submit>
      </FieldGroup>
    </form>
  )
}

export function MfaEnrollForm({ qrDataUrl, secret }: { qrDataUrl: string; secret: string }) {
  const [state, action, pending] = useActionState(confirmMfaAction, undefined)

  if (state?.recoveryCodes) {
    return (
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-lg font-semibold">Save your recovery codes</h1>
          <p className="meta mt-1">Each code works once if you lose your phone. They are shown only now. Store them in a password manager.</p>
        </div>
        <ul className="panel grid grid-cols-2 gap-x-4 gap-y-1 bg-muted p-3 font-mono text-sm tabular" aria-label="Recovery codes">
          {state.recoveryCodes.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
        <Button render={<Link href="/admin" />} size="lg" className="h-10 w-full">
          I have saved them, continue
        </Button>
      </div>
    )
  }

  return (
    <form action={action} noValidate>
      <FieldGroup>
        <div>
          <h1 className="text-lg font-semibold">Set up two-step verification</h1>
          <p className="meta mt-1">Required for every staff account. Scan the code with an authenticator app such as 1Password, Google Authenticator or Authy.</p>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qrDataUrl} alt="QR code for your authenticator app" width={176} height={176} className="mx-auto block bg-white p-2" />
        <Field>
          <FieldLabel htmlFor="secret">Or enter this key manually</FieldLabel>
          <Input id="secret" readOnly value={secret} className="h-10 font-mono text-sm" onFocus={(e) => e.currentTarget.select()} />
        </Field>
        <Field data-invalid={!!state?.error}>
          <FieldLabel htmlFor="code">6-digit code</FieldLabel>
          <Input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" spellCheck={false} required maxLength={6} className="h-10 text-base tracking-widest tabular" aria-invalid={!!state?.error} aria-describedby={state?.error ? "enroll-error" : "enroll-help"} />
          {state?.error ? <FieldError id="enroll-error">{state.error}</FieldError> : <FieldDescription id="enroll-help">Enter the code your app shows to confirm.</FieldDescription>}
        </Field>
        <Submit pending={pending}>Turn on</Submit>
      </FieldGroup>
    </form>
  )
}
