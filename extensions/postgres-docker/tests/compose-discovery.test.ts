import { describe, expect, it } from "bun:test";
import { extractPostgresServices } from "../src/discovery/compose";

describe("extractPostgresServices", () => {
	it("finds postgres service and mapped port", () => {
		const yaml = `services:\n  db:\n    image: postgres:16\n    ports:\n      - "5433:5432"\n    environment:\n      POSTGRES_DB: app\n      POSTGRES_USER: app\n      POSTGRES_PASSWORD: secret\n`;
		const services = extractPostgresServices(yaml);
		expect(services.length).toBe(1);
		if (services[0]) {
			expect(services[0].port).toBe(5433);
			expect(services[0].database).toBe("app");
		}
	});

	it("returns empty for non-postgres images", () => {
		const yaml = `services:\n  redis:\n    image: redis:7\n`;
		const services = extractPostgresServices(yaml);
		expect(services.length).toBe(0);
	});
});
