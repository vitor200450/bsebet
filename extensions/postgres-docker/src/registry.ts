import type { DbConnection } from "./types";

export function createRegistry() {
	const byWorkspace = new Map<string, DbConnection[]>();
	const activeByWorkspace = new Map<string, string>();

	return {
		setConnections(workspace: string, connections: DbConnection[]) {
			byWorkspace.set(workspace, connections);
			if (connections.length === 1) {
				activeByWorkspace.set(workspace, connections[0]!.name);
			}
		},
		list(workspace: string) {
			return byWorkspace.get(workspace) ?? [];
		},
		select(workspace: string, name: string) {
			activeByWorkspace.set(workspace, name);
		},
		getActive(workspace: string) {
			const all = byWorkspace.get(workspace) ?? [];
			const active = activeByWorkspace.get(workspace);
			return all.find((c) => c.name === active);
		},
	};
}
