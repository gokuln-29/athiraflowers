import { LegalPage, legalMetadata } from "@/components/site/legal-page"

export const generateMetadata = (props: PageProps<"/[locale]/delivery">) => legalMetadata("delivery", props.params)

export default async function Page({ params }: PageProps<"/[locale]/delivery">) {
  return <LegalPage pageKey="delivery" params={params} />
}
