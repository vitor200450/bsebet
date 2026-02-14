import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/tournaments")({
  component: TournamentsLayout,
});

function TournamentsLayout() {
  return <Outlet />;
}
