import { createFileRoute } from "@tanstack/react-router";
import { LandingPage } from "../components/LandingPage";
import { getUser } from "../functions/get-user";

export const Route = createFileRoute("/landing")({
	loader: async () => {
		const session = await getUser().catch(() => null);
		return { isAuthenticated: !!session };
	},
	component: LandingPageRoute,
});

function LandingPageRoute() {
	const { isAuthenticated } = Route.useLoaderData();
	return <LandingPage isAuthenticated={isAuthenticated} />;
}
