import { normalizeSection } from "../../lib/i18n";
import { CosmosApp } from "../CosmosApp";

interface SectionPageProps {
  readonly params: Promise<{ section: string }>;
}

export default async function SectionPage({ params }: SectionPageProps) {
  const { section } = await params;
  return <CosmosApp initialSection={normalizeSection(section)} />;
}
