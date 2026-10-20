import { LegalPage, legalMetadata } from "@/components/site/legal-page"

export const generateMetadata = (props: PageProps<"/[locale]/terms">) => legalMetadata("terms", props.params)

export default async function Page({ params }: PageProps<"/[locale]/terms">) {
  return <LegalPage pageKey="terms" params={params} />
}
