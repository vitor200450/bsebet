import { createFileRoute } from "@tanstack/react-router";
import { LegalDocumentPage } from "@/components/LegalDocumentPage";

export const Route = createFileRoute("/$lang/terms")({
	component: TermsPage,
});

function TermsPage() {
	return <LegalDocumentPage document="terms" />;
}
