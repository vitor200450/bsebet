import type { DbConnection } from "./types";

export type ExtensionConfig = {
	manualConnections: DbConnection[];
	queryTimeoutMs: number;
};

export function getDefaultConfig(): ExtensionConfig {
	return { manualConnections: [], queryTimeoutMs: 15000 };
}
