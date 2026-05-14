export const EXTENSION_NAME = "postgres-docker";

export type DbConnection = {
	name: string;
	host: string;
	port: number;
	database: string;
	user: string;
	password: string;
	source: "compose" | "env" | "manual";
};
