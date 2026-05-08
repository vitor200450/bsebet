import { beforeAll, describe, expect, mock, test } from "bun:test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import i18n from "i18next";
import { JSDOM } from "jsdom";
import type { ReactNode } from "react";
import { I18nextProvider, initReactI18next } from "react-i18next";
import commonPt from "@/locales/pt/common.json";
import profilePt from "@/locales/pt/profile.json";

mock.module("@tanstack/react-router", () => ({
	createFileRoute: () => () => ({
		fullPath: "/$lang/profile",
		useRouteContext: () => ({
			session: {
				user: {
					id: "user-1",
					name: "Capybara Player",
					email: "capy@example.com",
					nickname: "Capy",
					image: null,
				},
			},
		}),
	}),
	Link: ({ children, ...props }: { children: ReactNode }) => (
		<a {...props}>{children}</a>
	),
	redirect: () => {
		throw new Error("redirect should not be called in tests");
	},
}));

mock.module("@/i18n/useLangLink", () => ({
	useLangLink: () => ({
		linkTo: () => "/pt/dashboard",
		routeTo: () => ({ to: "/pt/users/$userId" }),
	}),
}));

mock.module("@/lib/auth-client", () => ({
	authClient: {
		useSession: () => ({ refetch: async () => null }),
	},
}));

mock.module("@/functions/get-user", () => ({
	getUser: async () => ({
		user: {
			id: "user-1",
			name: "Capybara Player",
			email: "capy@example.com",
			nickname: "Capy",
			image: null,
		},
	}),
}));

mock.module("@/server/users", () => ({
	getMyProfile: async () => ({
		id: "user-1",
		nickname: "Capy",
		image: null,
		name: "Capybara Player",
		email: "capy@example.com",
	}),
	restoreGoogleAvatar: async () => ({ pictureUrl: null }),
	updateNickname: async () => null,
	uploadUserAvatar: async () => null,
}));

mock.module("@/components/image-cropper", () => ({
	ImageCropper: () => null,
}));

describe("profile page polish", () => {
	beforeAll(async () => {
		const dom = new JSDOM("<!doctype html><html><body></body></html>");
		globalThis.window = dom.window as never;
		globalThis.document = dom.window.document;
		globalThis.navigator = dom.window.navigator as never;
		globalThis.HTMLElement = dom.window.HTMLElement as never;
		globalThis.HTMLInputElement = dom.window.HTMLInputElement as never;
		globalThis.FileReader = dom.window.FileReader as never;

		if (!i18n.isInitialized) {
			await i18n.use(initReactI18next).init({
				lng: "pt",
				fallbackLng: "pt",
				resources: {
					pt: {
						profile: profilePt,
						common: commonPt,
					},
				},
				interpolation: { escapeValue: false },
			});
		}
	});

	test("renders polished profile sections and actions", async () => {
		const { ProfilePageContent } = await import("./profile");
		const queryClient = new QueryClient();

		const view = render(
			<I18nextProvider i18n={i18n}>
				<QueryClientProvider client={queryClient}>
					<ProfilePageContent
						initialSession={{
							user: {
								id: "user-1",
								name: "Capybara Player",
								email: "capy@example.com",
								nickname: "Capy",
								image: null,
							},
						}}
					/>
				</QueryClientProvider>
			</I18nextProvider>,
		);

		expect(view.getByText("FOTO DE PERFIL")).toBeTruthy();
		expect(view.getByText("DADOS DA CONTA")).toBeTruthy();
		expect(view.getByText("NICKNAME")).toBeTruthy();
		expect(
			view.getByRole("button", { name: /SALVAR ALTERAÇÕES/i }),
		).toBeTruthy();
		expect(view.getByText("Ver Perfil Público")).toBeTruthy();
	});
});
