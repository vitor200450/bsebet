import { createFileRoute } from "@tanstack/react-router";
import { LandingPage } from "../../components/LandingPage";
import { getUser } from "../../functions/get-user";
import { getLeaderboard } from "../../server/leaderboard";

export const Route = createFileRoute("/$lang/landing")({
	loader: async () => {
		const [session, leaderboard] = await Promise.all([
			getUser().catch(() => null),
			getLeaderboard().catch(() => []),
		]);
		return {
			isAuthenticated: !!session,
			topUsers: leaderboard.slice(0, 5),
		};
	},
	component: LandingPageRoute,
});

function LandingPageRoute() {
	const { isAuthenticated, topUsers } = Route.useLoaderData();
	return <LandingPage isAuthenticated={isAuthenticated} topUsers={topUsers} />;
}
