import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/tournaments")({
	component: TournamentsLayout,
});

function TournamentsLayout() {
	return (
		<div>
			<Outlet />
		</div>
	);
}
