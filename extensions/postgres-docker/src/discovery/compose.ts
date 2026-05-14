import YAML from "yaml";

type ServiceCandidate = {
	name: string;
	host: string;
	port: number;
	database: string;
	user: string;
	password: string;
};

export function extractPostgresServices(text: string): ServiceCandidate[] {
	const doc = YAML.parse(text) as { services?: Record<string, any> };
	const services = doc?.services ?? {};
	const out: ServiceCandidate[] = [];
	for (const [name, service] of Object.entries(services)) {
		const image = String(service?.image ?? "").toLowerCase();
		if (!image.includes("postgres")) continue;
		const ports = service?.ports ?? [];
		const first = String(ports[0] ?? "5432:5432");
		const hostPort = Number(first.split(":")[0].replaceAll("\"", ""));
		const env = service?.environment ?? {};
		out.push({
			name,
			host: "127.0.0.1",
			port: Number.isFinite(hostPort) ? hostPort : 5432,
			database: env.POSTGRES_DB ?? "postgres",
			user: env.POSTGRES_USER ?? "postgres",
			password: env.POSTGRES_PASSWORD ?? "postgres",
		});
	}
	return out;
}
