import { LegalPage, legalDocuments } from "@/lib/legal-page";

export default function PrivacyPage() {
  return <LegalPage document={legalDocuments.privacy} />;
}
