export function buildListTablesSql(schema?: string) {
	if (schema) {
		return `SELECT table_schema, table_name FROM information_schema.tables WHERE table_type = 'BASE TABLE' AND table_schema = $1 ORDER BY table_name`;
	}
	return `SELECT table_schema, table_name FROM information_schema.tables WHERE table_type = 'BASE TABLE' ORDER BY table_schema, table_name`;
}

export const LIST_SCHEMAS_SQL = `SELECT schema_name FROM information_schema.schemata ORDER BY schema_name`;
