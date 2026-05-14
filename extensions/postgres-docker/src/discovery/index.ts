import type { DbConnection } from "../types";

export function mergeConnections(discovered: DbConnection[], manual: DbConnection[]): DbConnection[] {
	const map = new Map<string, DbConnection>();
	for (const c of discovered) map.set(c.name, c);
	for (const c of manual) map.set(c.name, c);
	return [...map.values()];
}
