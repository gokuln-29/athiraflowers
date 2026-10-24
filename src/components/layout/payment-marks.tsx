// Payment method marks shown in the footer. Only methods that work at checkout today
// (card via Stripe, Apple Pay). Each is a self-contained 40x26 card so they line up.
import type { ReactNode } from "react";

function Mark({ label, children }: { label: string; children: ReactNode }) {
  return (
    <svg
      role="img"
      aria-label={label}
      viewBox="0 0 40 26"
      width="40"
      height="26"
      className="h-[26px] w-10 shrink-0"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="40" height="26" rx="3.5" fill="#fff" />
      <rect x="0.5" y="0.5" width="39" height="25" rx="3" fill="none" stroke="#000" strokeOpacity="0.12" />
      {children}
    </svg>
  );
}

export function VisaMark() {
  return (
    <Mark label="Visa">
      <text
        x="20"
        y="17.5"
        textAnchor="middle"
        fontFamily="Arial, Helvetica, sans-serif"
        fontSize="13"
        fontWeight="800"
        fontStyle="italic"
        letterSpacing="-0.3"
        fill="#1a1f71"
      >
        VISA
      </text>
    </Mark>
  );
}

export function MastercardMark() {
  return (
    <Mark label="Mastercard">
      <circle cx="15.5" cy="13" r="7" fill="#eb001b" />
      <circle cx="24.5" cy="13" r="7" fill="#f79e1b" />
      <path d="M20 7.6a7 7 0 0 1 0 10.8 7 7 0 0 1 0-10.8z" fill="#ff5f00" />
    </Mark>
  );
}

export function ApplePayMark() {
  return (
    <Mark label="Apple Pay">
      <g transform="translate(5.5 5.2) scale(0.64)" fill="#000">
        <path d="M16.4 12.6c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.1-2.8.9-3.5.9-.7 0-1.9-.8-3.1-.8-1.6 0-3.1.9-3.9 2.3-1.7 2.9-.4 7.2 1.2 9.6.8 1.2 1.8 2.5 3.1 2.5 1.2-.1 1.7-.8 3.2-.8 1.5 0 1.9.8 3.2.8 1.3 0 2.2-1.2 3-2.4.9-1.3 1.3-2.6 1.3-2.7-.1 0-2.6-1-2.6-3.8zM14.1 5.7c.7-.8 1.1-1.9 1-3-1 0-2.1.7-2.8 1.5-.6.7-1.2 1.8-1 2.9 1.1.1 2.1-.5 2.8-1.4z" />
      </g>
      <text
        x="29"
        y="17"
        textAnchor="middle"
        fontFamily="Arial, Helvetica, sans-serif"
        fontSize="9.5"
        fontWeight="600"
        fill="#000"
      >
        Pay
      </text>
    </Mark>
  );
}

export function PaymentMarks({ className }: { className?: string }) {
  return (
    <div className={className}>
      <VisaMark />
      <MastercardMark />
      <ApplePayMark />
    </div>
  );
}
