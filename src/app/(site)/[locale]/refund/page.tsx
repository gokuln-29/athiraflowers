import { LegalPage, legalMetadata } from "@/components/site/legal-page"

export const generateMetadata = (props: PageProps<"/[locale]/refund">) => legalMetadata("refund", props.params)

export default async function Page({ params }: PageProps<"/[locale]/refund">) {
  return <LegalPage pageKey="refund" params={params} />
}
