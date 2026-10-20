import { JsonLd } from "@/components/seo/json-ld"

/** FAQPage structured data for question-style answer-engine content. Mirrors the visible FAQ exactly. */
export function FaqJsonLd({ items }: { items: { question: string; answer: string }[] }) {
  if (items.length === 0) return null
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: items.map((i) => ({ "@type": "Question", name: i.question, acceptedAnswer: { "@type": "Answer", text: i.answer } })),
      }}
    />
  )
}
