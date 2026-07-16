import { createFileRoute } from "@tanstack/react-router";
import { LandingPage } from "../../components/LandingPage";
import { getUser } from "../../functions/get-user";
import { getLandingMatchups } from "../../server/landing-matchups";
import { getLeaderboard } from "../../server/leaderboard";

export const Route = createFileRoute("/$lang/landing")({
	loader: async () => {
		const [session, leaderboard, matchups] = await Promise.all([
			getUser().catch(() => null),
			getLeaderboard().catch(() => []),
			getLandingMatchups().catch(() => []),
		]);
		return {
			isAuthenticated: !!session,
			topUsers: leaderboard.slice(0, 5),
			matchups,
		};
	},
	component: LandingPageRoute,
});

function LandingPageRoute() {
	const { isAuthenticated, topUsers, matchups } = Route.useLoaderData();
	return (
		<LandingPage
			isAuthenticated={isAuthenticated}
			topUsers={topUsers}
			matchups={matchups}
		/>
	);
}
