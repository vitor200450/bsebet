# Profile Page Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Polish the `/profile` page so it matches the redesigned dashboard language while preserving the current three-block editing structure and all existing behaviors.

**Architecture:** Keep the existing single-route implementation in `apps/web/src/routes/$lang/profile.tsx` and perform a focused UI refactor in place. Reuse the current data flow and mutation handlers, limit changes to layout, hierarchy, and styling, and add a lightweight component test that verifies the main sections and key CTAs render correctly.

**Tech Stack:** TanStack Start, React 19, react-i18next, TanStack Query, Tailwind utility classes, Bun test, Testing Library, jsdom.

---

## File Structure

- `apps/web/src/routes/$lang/profile.tsx`
  - Owns the full profile page layout, edit actions, avatar upload flow, nickname form, and public profile CTA.
- `apps/web/src/routes/$lang/profile.test.tsx`
  - Focused render test for the polished profile surface and section hierarchy.

### Task 1: Add a Failing Profile Page Render Test

**Files:**
- Create: `apps/web/src/routes/$lang/profile.test.tsx`
- Modify: `apps/web/package.json`
- Test: `apps/web/src/routes/$lang/profile.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, test } from "bun:test";
import i18n from "i18next";
import { I18nextProvider, initReactI18next } from "react-i18next";
import profilePt from "@/locales/pt/profile.json";
import commonPt from "@/locales/pt/common.json";

describe("profile page polish", () => {
	beforeAll(async () => {
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
		const { RouteComponent } = await import("./profile");
		const queryClient = new QueryClient();

		render(
			<I18nextProvider i18n={i18n}>
				<QueryClientProvider client={queryClient}>
					<RouteComponent />
				</QueryClientProvider>
			</I18nextProvider>,
		);

		expect(screen.getByText("FOTO DE PERFIL")).toBeTruthy();
		expect(screen.getByText("DADOS DA CONTA")).toBeTruthy();
		expect(screen.getByText("NICKNAME")).toBeTruthy();
		expect(screen.getByRole("button", { name: "SALVAR ALTERAÇÕES" })).toBeTruthy();
		expect(screen.getByRole("link", { name: "Ver Perfil Público" })).toBeTruthy();
	});
});
```

- [ ] **Step 2: Export the route component so the test can import it**

```tsx
export function RouteComponent() {
	// existing implementation
}
```

- [ ] **Step 3: Add a test script to the web package**

```json
{
	"scripts": {
		"build": "vite build",
		"test": "bun test"
	}
}
```

- [ ] **Step 4: Run test to verify it fails**

Run: `bun --cwd apps/web test src/routes/$lang/profile.test.tsx`
Expected: FAIL because `RouteComponent` is not yet exported or the current page structure does not satisfy the new assertions cleanly.

- [ ] **Step 5: Commit**

```bash
git add apps/web/package.json apps/web/src/routes/$lang/profile.test.tsx apps/web/src/routes/$lang/profile.tsx
git commit -m "test: add profile page polish coverage"
```

### Task 2: Polish the Page Header and Shared Card Rhythm

**Files:**
- Modify: `apps/web/src/routes/$lang/profile.tsx:152-190`
- Test: `apps/web/src/routes/$lang/profile.test.tsx`

- [ ] **Step 1: Write the failing assertion for header hierarchy**

```tsx
test("renders a tighter dashboard-style profile header", async () => {
	const { RouteComponent } = await import("./profile");
	const queryClient = new QueryClient();

	render(
		<I18nextProvider i18n={i18n}>
			<QueryClientProvider client={queryClient}>
				<RouteComponent />
			</QueryClientProvider>
		</I18nextProvider>,
	);

	expect(screen.getByRole("heading", { name: "Perfil" })).toBeTruthy();
	expect(screen.getByText("Edite suas informações")).toBeTruthy();
});
```

- [ ] **Step 2: Run test to verify it fails if export/setup still incomplete**

Run: `bun --cwd apps/web test src/routes/$lang/profile.test.tsx -t "dashboard-style profile header"`
Expected: FAIL until the route component export and final polished structure are in place.

- [ ] **Step 3: Replace the page shell and header with a cleaner dashboard-aligned structure**

```tsx
return (
	<div className="relative min-h-screen bg-[#f0f0f0] pb-16">
		<div
			className="pointer-events-none fixed inset-0 opacity-[0.12] mix-blend-multiply"
			style={{
				backgroundImage:
					'url("https://www.transparenttextures.com/patterns/cream-paper.png")',
				backgroundRepeat: "repeat",
			}}
		/>

		<div className="relative z-10 mx-auto max-w-[560px] px-4 py-8 md:py-12">
			<header className="mb-8">
				<div className="flex items-center gap-3">
					<div className="flex h-10 w-10 items-center justify-center rounded-md bg-[#121212]">
						<span className="material-symbols-outlined text-white text-xl">
							manage_accounts
						</span>
					</div>
					<div>
						<h1 className="font-black text-4xl text-[#121212] uppercase italic tracking-tighter md:text-5xl">
							{t("title")}
						</h1>
						<p className="mt-1 font-bold text-gray-600 text-sm md:text-base">
							{t("editInfo")}
						</p>
					</div>
				</div>
			</header>

			<div className="flex flex-col gap-5">
				{/* cards */}
			</div>
		</div>
	</div>
);
```

- [ ] **Step 4: Normalize every section card to one shared visual rhythm**

```tsx
const sectionCardClassName =
	"border-[3px] border-black bg-white p-6 shadow-[4px_4px_0_0_#000]";
```

- [ ] **Step 5: Run the focused test**

Run: `bun --cwd apps/web test src/routes/$lang/profile.test.tsx -t "dashboard-style profile header"`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/routes/$lang/profile.tsx apps/web/src/routes/$lang/profile.test.tsx
git commit -m "feat: align profile page shell with dashboard"
```

### Task 3: Rework the Avatar Card for Balanced Identity Editing

**Files:**
- Modify: `apps/web/src/routes/$lang/profile.tsx:190-264`
- Test: `apps/web/src/routes/$lang/profile.test.tsx`

- [ ] **Step 1: Add a failing assertion for avatar actions**

```tsx
test("renders avatar editing controls prominently", async () => {
	const { RouteComponent } = await import("./profile");
	const queryClient = new QueryClient();

	render(
		<I18nextProvider i18n={i18n}>
			<QueryClientProvider client={queryClient}>
				<RouteComponent />
			</QueryClientProvider>
		</I18nextProvider>,
	);

	expect(screen.getByText("FOTO DE PERFIL")).toBeTruthy();
	expect(screen.getByRole("button", { name: "TROCAR FOTO" })).toBeTruthy();
	expect(screen.getByRole("button", { name: /GOOGLE/i })).toBeTruthy();
});
```

- [ ] **Step 2: Run test to verify it fails before final layout exists**

Run: `bun --cwd apps/web test src/routes/$lang/profile.test.tsx -t "avatar editing controls prominently"`
Expected: FAIL until the revised hierarchy is implemented.

- [ ] **Step 3: Rebuild the avatar card with a larger, cleaner avatar frame and clearer actions**

```tsx
<section className={sectionCardClassName}>
	<div className="mb-5 flex items-center gap-3">
		<div className="flex h-10 w-10 items-center justify-center rounded-md border-2 border-black bg-[#2e5cff] shadow-[2px_2px_0_0_#000]">
			<Camera className="h-5 w-5 text-white" strokeWidth={3} />
		</div>
		<h2 className="font-black text-[#121212] text-xl uppercase italic tracking-tighter">
			{t("avatarSection")}
		</h2>
	</div>

	<div className="flex flex-col items-center gap-4">
		<div className="relative">
			<div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-xl border-[3px] border-black bg-[#e6e6e6] shadow-[4px_4px_0_0_#000]">
				{displayImage ? (
					<img src={displayImage} alt="Avatar" className="h-full w-full object-cover" />
				) : (
					<User size={60} strokeWidth={1.5} className="text-gray-400" />
				)}
			</div>

			<button
				onClick={() => fileInputRef.current?.click()}
				className="absolute -right-2 -bottom-2 flex h-10 w-10 items-center justify-center rounded-md border-[3px] border-black bg-[#ffc700] shadow-[2px_2px_0_0_#000] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
			>
				<Camera size={16} strokeWidth={3} className="text-black" />
			</button>
		</div>

		<div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
			<button
				onClick={() => fileInputRef.current?.click()}
				className="rounded-md border-2 border-black bg-[#2e5cff] px-4 py-3 font-black text-sm text-white uppercase tracking-wider shadow-[3px_3px_0_0_#000] transition-all hover:shadow-[2px_2px_0_0_#000]"
			>
				{t("changePhoto")}
			</button>
			<button
				onClick={handleRestoreGoogleAvatar}
				disabled={isRestoring}
				title={t("restoreGoogle")}
				className="rounded-md border-2 border-black bg-white px-4 py-3 font-black text-sm text-black uppercase tracking-wider shadow-[3px_3px_0_0_#000] transition-all hover:shadow-[2px_2px_0_0_#000] disabled:opacity-50"
			>
				{isRestoring ? t("loading") : `${t("google")}`}
			</button>
		</div>

		<p className="font-bold text-[10px] text-gray-500 uppercase tracking-wider">
			{t("avatarNote")}
		</p>
	</div>
</section>
```

- [ ] **Step 4: Run the focused test**

Run: `bun --cwd apps/web test src/routes/$lang/profile.test.tsx -t "avatar editing controls prominently"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/routes/$lang/profile.tsx apps/web/src/routes/$lang/profile.test.tsx
git commit -m "feat: polish profile avatar editor card"
```

### Task 4: Clean Up the Locked Account Data Card

**Files:**
- Modify: `apps/web/src/routes/$lang/profile.tsx:266-314`
- Test: `apps/web/src/routes/$lang/profile.test.tsx`

- [ ] **Step 1: Add a failing assertion for locked account fields**

```tsx
test("renders locked account fields as read-only information", async () => {
	const { RouteComponent } = await import("./profile");
	const queryClient = new QueryClient();

	render(
		<I18nextProvider i18n={i18n}>
			<QueryClientProvider client={queryClient}>
				<RouteComponent />
			</QueryClientProvider>
		</I18nextProvider>,
	);

	expect(screen.getByText("DADOS DA CONTA")).toBeTruthy();
	expect(screen.getByText("NOME")).toBeTruthy();
	expect(screen.getByText("E-MAIL")).toBeTruthy();
});
```

- [ ] **Step 2: Run test to verify it fails before final styling is complete**

Run: `bun --cwd apps/web test src/routes/$lang/profile.test.tsx -t "locked account fields as read-only information"`
Expected: FAIL until the revised section is fully in place.

- [ ] **Step 3: Refactor the account data card into cleaner locked info rows**

```tsx
<section className={sectionCardClassName}>
	<div className="mb-5 flex items-center gap-3">
		<div className="flex h-10 w-10 items-center justify-center rounded-md border-2 border-black bg-[#ff2e2e] shadow-[2px_2px_0_0_#000]">
			<Lock className="h-5 w-5 text-white" strokeWidth={3} />
		</div>
		<h2 className="font-black text-[#121212] text-xl uppercase italic tracking-tighter">
			{t("accountSection")}
		</h2>
	</div>

	<div className="space-y-3">
		<div className="rounded-md border-2 border-black/15 bg-[#e6e6e6] px-4 py-3">
			<div className="mb-1 font-black text-[9px] text-gray-500 uppercase tracking-widest">
				{t("nameLabel")}
			</div>
			<div className="flex items-center justify-between gap-3">
				<span className="font-black text-black text-sm">{user?.name ?? "—"}</span>
				<Lock size={14} strokeWidth={2.5} className="shrink-0 text-gray-400" />
			</div>
		</div>

		<div className="rounded-md border-2 border-black/15 bg-[#e6e6e6] px-4 py-3">
			<div className="mb-1 font-black text-[9px] text-gray-500 uppercase tracking-widest">
				{t("emailLabel")}
			</div>
			<div className="flex items-center justify-between gap-3">
				<span className="truncate font-black text-black text-sm">{user?.email ?? "—"}</span>
				<Lock size={14} strokeWidth={2.5} className="shrink-0 text-gray-400" />
			</div>
		</div>
	</div>

	<p className="mt-4 font-bold text-[10px] text-gray-500 uppercase tracking-wider">
		{t("googleAccountNote")}
	</p>
</section>
```

- [ ] **Step 4: Run the focused test**

Run: `bun --cwd apps/web test src/routes/$lang/profile.test.tsx -t "locked account fields as read-only information"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/routes/$lang/profile.tsx apps/web/src/routes/$lang/profile.test.tsx
git commit -m "feat: polish locked account profile card"
```

### Task 5: Make the Nickname Card the Primary Editing Surface

**Files:**
- Modify: `apps/web/src/routes/$lang/profile.tsx:316-396`
- Test: `apps/web/src/routes/$lang/profile.test.tsx`

- [ ] **Step 1: Add a failing assertion for nickname and primary actions**

```tsx
test("renders nickname editor with primary and secondary actions", async () => {
	const { RouteComponent } = await import("./profile");
	const queryClient = new QueryClient();

	render(
		<I18nextProvider i18n={i18n}>
			<QueryClientProvider client={queryClient}>
				<RouteComponent />
			</QueryClientProvider>
		</I18nextProvider>,
	);

	expect(screen.getByText("NICKNAME")).toBeTruthy();
	expect(screen.getByRole("button", { name: "SALVAR ALTERAÇÕES" })).toBeTruthy();
	expect(screen.getByRole("link", { name: "Ver Perfil Público" })).toBeTruthy();
});
```

- [ ] **Step 2: Run test to verify it fails before the final action layout is finished**

Run: `bun --cwd apps/web test src/routes/$lang/profile.test.tsx -t "nickname editor with primary and secondary actions"`
Expected: FAIL until the nickname section is reworked.

- [ ] **Step 3: Rebuild the nickname section as the clearest editable surface on the page**

```tsx
<section className={sectionCardClassName}>
	<div className="mb-5 flex items-center gap-3">
		<div className="flex h-10 w-10 items-center justify-center rounded-md border-2 border-black bg-[#ffc700] shadow-[2px_2px_0_0_#000]">
			<span className="material-symbols-outlined text-black text-xl">id_card</span>
		</div>
		<h2 className="font-black text-[#121212] text-xl uppercase italic tracking-tighter">
			{t("nicknameSection")}
		</h2>
	</div>

	<div className="space-y-4">
		<div>
			<label className="mb-2 block font-black text-[10px] text-gray-500 uppercase tracking-widest">
				{t("nicknameLabel")}
			</label>
			<input
				value={nickname}
				onChange={(e) => setNickname(e.target.value)}
				placeholder={t("nicknamePlaceholder")}
				className="h-12 w-full border-[3px] border-black bg-white px-4 font-black text-black text-base outline-none transition-shadow focus:shadow-[3px_3px_0_0_#ffc700]"
			/>
			<p className="mt-2 font-bold text-[10px] text-gray-500 uppercase tracking-wider">
				{t("displayNameHint")}
			</p>
		</div>

		<div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
			<Link
				to={linkTo("/users/$userId")}
				params={{ userId: user.id }}
				className="flex items-center justify-center rounded-md border-2 border-black bg-white px-4 py-3 font-black text-sm text-black uppercase tracking-wider shadow-[3px_3px_0_0_#000] transition-all hover:shadow-[2px_2px_0_0_#000]"
			>
				{t("viewPublic")}
			</Link>

			<button
				onClick={handleSave}
				disabled={isSaving}
				className="flex items-center justify-center gap-2 rounded-md border-2 border-black bg-[#ffc700] px-5 py-3 font-black text-sm text-black uppercase tracking-wider shadow-[3px_3px_0_0_#000] transition-all hover:shadow-[2px_2px_0_0_#000] disabled:opacity-60"
			>
				<Save className="h-4 w-4" strokeWidth={2.5} />
				{isSaving ? t("saving") : t("saveChanges")}
			</button>
		</div>
	</div>
</section>
```

- [ ] **Step 4: Run the focused test**

Run: `bun --cwd apps/web test src/routes/$lang/profile.test.tsx -t "nickname editor with primary and secondary actions"`
Expected: PASS

- [ ] **Step 5: Run full profile test file**

Run: `bun --cwd apps/web test src/routes/$lang/profile.test.tsx`
Expected: PASS

- [ ] **Step 6: Run build verification**

Run: `bun run turbo -F web build`
Expected: Build completes successfully

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/routes/$lang/profile.tsx apps/web/src/routes/$lang/profile.test.tsx
git commit -m "feat: polish profile nickname editor"
```
