import { createFileRoute } from "@tanstack/react-router";
import { LegalDocumentPage } from "@/components/LegalDocumentPage";

export const Route = createFileRoute("/$lang/privacy")({
	component: PrivacyPage,
});

function PrivacyPage() {
	return <LegalDocumentPage document="privacy" />;
}
