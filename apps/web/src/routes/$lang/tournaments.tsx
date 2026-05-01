import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/$lang/tournaments")({
	component: TournamentsLayout,
});

function TournamentsLayout() {
	return <Outlet />;
}
