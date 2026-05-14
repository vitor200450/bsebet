import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { registerAllTools } from "./tools";

export function createExtension() {
	const toolNames = [
		"db_list_connections",
		"db_select_connection",
		"db_introspect",
		"db_query",
		"db_healthcheck",
		"db_refresh_discovery",
	] as const;

	return {
		name: "postgres-docker",
		getToolNames() {
			return [...toolNames];
		},
	};
}

export default function (pi: ExtensionAPI) {
	registerAllTools(pi);
}
