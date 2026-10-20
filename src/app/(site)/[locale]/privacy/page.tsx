import { LegalPage, legalMetadata } from "@/components/site/legal-page"

export const generateMetadata = (props: PageProps<"/[locale]/privacy">) => legalMetadata("privacy", props.params)

export default async function Page({ params }: PageProps<"/[locale]/privacy">) {
  return <LegalPage pageKey="privacy" params={params} />
}
