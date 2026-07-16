import { createFileRoute } from "@tanstack/react-router";
import { LoginPage } from "@/components/LoginPage";

export const Route = createFileRoute("/$lang/login")({
	component: RouteComponent,
});

function RouteComponent() {
	const { lang } = Route.useParams();
	return <LoginPage lang={lang} />;
}
