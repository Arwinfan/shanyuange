import { LegalPage, legalDocuments } from "@/lib/legal-page";

export default function TermsPage() {
  return <LegalPage document={legalDocuments.terms} />;
}
