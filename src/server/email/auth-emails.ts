import { emailLayout, esc } from "./layout"
import type { OutgoingEmail } from "./brevo"

export function otpEmail(locale: "en" | "ar", to: string, code: string): OutgoingEmail {
  const ar = locale === "ar"
  const subject = ar ? `رمز الدخول: ${code}` : `Your sign-in code: ${code}`
  const title = ar ? "رمز الدخول الخاص بك" : "Your sign-in code"
  const lead = ar ? "أدخلوا هذا الرمز لتسجيل الدخول. ينتهي خلال 10 دقائق." : "Enter this code to sign in. It expires in 10 minutes."
  const note = ar ? "إن لم تطلبوا هذا الرمز فتجاهلوا الرسالة. لن يتغير شيء في حسابكم." : "If you did not ask for this code, you can ignore this email. Nothing will change on your account."
  const html = emailLayout(locale, {
    preheader: subject,
    title,
    bodyHtml: `<p style="margin:0 0 16px;">${esc(lead)}</p>
<p style="font-size:34px;letter-spacing:8px;font-weight:600;margin:0 0 16px;direction:ltr;text-align:${ar ? "right" : "left"};font-family:Menlo,Consolas,monospace;">${esc(code)}</p>
<p style="margin:0;color:#5a524c;font-size:14px;">${esc(note)}</p>`,
  })
  return { to, subject, html, text: `${title}\n\n${lead}\n\n${code}\n\n${note}`, tags: ["otp"] }
}
