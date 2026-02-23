import { Check, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { updateTeamSeeding } from "@/server/tournament-teams";
import { TeamLogo } from "../TeamLogo";

interface Team {
	id: number;
	name: string;
	logoUrl: string | null;
	region: string | null;
	group: string | null;
	seed: number | null;
}

interface TournamentSeedingManagerProps {
	teams: Team[];
	tournamentId: number;
	groupsCount?: number;
	maxTeamsPerGroup?: number;
}

const GROUPS = ["A", "B", "C", "D", "E", "F", "G", "H"];
const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8];

export function TournamentSeedingManager({
	teams,
	tournamentId,
	groupsCount = 4,
	maxTeamsPerGroup = 4,
}: TournamentSeedingManagerProps) {
	const [localTeams, setLocalTeams] = useState(teams);
	const [savingTeams, setSavingTeams] = useState<Set<number>>(new Set());
	const [justSavedTeams, setJustSavedTeams] = useState<Set<number>>(new Set());

	// Function to save change to server
	const saveTeamChange = async (team: Team, field: string, value: any) => {
		setSavingTeams((prev) => new Set(prev).add(team.id));

		// Optimistic update details
		const updatedTeam = { ...team, [field]: value };

		try {
			await updateTeamSeeding({
				data: {
					tournamentId,
					teamId: updatedTeam.id,
					group: updatedTeam.group,
					seed: updatedTeam.seed,
				},
			});

			// Show "Saved" state briefly
			setJustSavedTeams((prev) => new Set(prev).add(team.id));
			setTimeout(() => {
				setJustSavedTeams((prev) => {
					const next = new Set(prev);
					next.delete(team.id);
					return next;
				});
			}, 2000);
		} catch (e) {
			toast.error(`Failed to save ${team.name}`);
			// Revert local change if needed (complex with optimistic UI, skipping for now as explicit error is enough)
		} finally {
			setSavingTeams((prev) => {
				const next = new Set(prev);
				next.delete(team.id);
				return next;
			});
		}
	};

	const handleUpdate = (
		teamId: number,
		field: "group" | "seed",
		value: string | number | null,
	) => {
		// Check constraints if changing group
		if (field === "group" && value) {
			const targetGroup = value as string;
			const currentGroupCount = localTeams.filter(
				(t) => t.group === targetGroup && t.id !== teamId,
			).length;

			if (currentGroupCount >= maxTeamsPerGroup) {
				toast.error(
					`Group ${targetGroup} is full (Max ${maxTeamsPerGroup} teams)`,
				);
				return;
			}
		}

		// Check constraints if changing seed
		if (field === "seed" && value) {
			const targetSeed = Number(value);
			const currentGroup = localTeams.find((t) => t.id === teamId)?.group;

			if (currentGroup) {
				const seedTaken = localTeams.some(
					(t) =>
						t.group === currentGroup &&
						t.id !== teamId &&
						t.seed === targetSeed,
				);
				if (seedTaken) {
					toast.error(
						`Seed ${targetSeed} is already taken in Group ${currentGroup}`,
					);
					return;
				}
			}
		}

		// 1. Update local state immediately
		setLocalTeams((prev) =>
			prev.map((t) => {
				if (t.id === teamId) {
					const updated = { ...t, [field]: value };
					// 2. Trigger background save
					saveTeamChange(updated, field, value);
					return updated;
				}
				return t;
			}),
		);
	};

	// Group teams by assigned group for better visualization
	const groupedTeams = localTeams.reduce(
		(acc, team) => {
			const g = team.group || "Unassigned";
			if (!acc[g]) acc[g] = [];
			acc[g].push(team);
			return acc;
		},
		{} as Record<string, Team[]>,
	);

	const availableGroups = GROUPS.slice(0, groupsCount);

	return (
		<div className="space-y-8">
			<div className="flex items-center justify-between border-[4px] border-black bg-white p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]">
				<div>
					<h2 className="font-black text-2xl text-black uppercase italic">
						Seeding Manager
					</h2>
					<p className="font-bold text-gray-500 text-sm">
						Assign teams to groups and seeds. Changes are saved automatically.
					</p>
				</div>
				<div className="flex items-center gap-2">
					{/* Global Status Indicator could go here */}
					{savingTeams.size > 0 && (
						<div className="flex items-center gap-2 font-bold text-gray-500 text-xs uppercase">
							<Loader2 className="h-4 w-4 animate-spin" />
							Saving {savingTeams.size} changes...
						</div>
					)}
				</div>
			</div>

			<div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
				{/* Unassigned Teams */}
				{groupedTeams["Unassigned"]?.length > 0 && (
					<div className="border-2 border-black/20 border-dashed bg-gray-100 p-4 lg:col-span-2">
						<h3 className="mb-4 font-black text-gray-400 uppercase">
							Unassigned Teams
						</h3>
						<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
							{groupedTeams["Unassigned"].map((team) => (
								<TeamSeedingCard
									key={team.id}
									team={team}
									availableGroups={availableGroups}
									onUpdate={handleUpdate}
									isSaving={savingTeams.has(team.id)}
									isSaved={justSavedTeams.has(team.id)}
									maxTeamsPerGroup={maxTeamsPerGroup}
								/>
							))}
						</div>
					</div>
				)}

				{/* Groups */}
				{availableGroups.map((group) => (
					<div
						key={group}
						className="flex flex-col border-[3px] border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
					>
						<div className="flex items-center justify-between bg-black px-4 py-2 font-black text-white uppercase italic">
							<span>Group {group}</span>
							<span className="font-normal text-gray-400 text-xs not-italic">
								{(groupedTeams[group] || []).length} Teams
							</span>
						</div>
						<div className="flex flex-col gap-3 p-4">
							{(groupedTeams[group] || [])
								.sort((a, b) => (a.seed || 99) - (b.seed || 99))
								.map((team) => (
									<TeamSeedingCard
										key={team.id}
										team={team}
										availableGroups={availableGroups}
										onUpdate={handleUpdate}
										isSaving={savingTeams.has(team.id)}
										isSaved={justSavedTeams.has(team.id)}
										maxTeamsPerGroup={maxTeamsPerGroup}
									/>
								))}
							{(groupedTeams[group] || []).length === 0 && (
								<div className="py-8 text-center font-bold text-gray-300 text-xs uppercase">
									Empty Group
								</div>
							)}
						</div>
					</div>
				))}
			</div>
		</div>
	);
}

function TeamSeedingCard({
	team,
	availableGroups,
	onUpdate,
	isSaving,
	isSaved,
	maxTeamsPerGroup,
}: {
	team: Team;
	availableGroups: string[];
	onUpdate: (id: number, field: "group" | "seed", value: any) => void;
	isSaving: boolean;
	isSaved: boolean;
	maxTeamsPerGroup: number;
}) {
	return (
		<div className="relative flex items-center gap-3 border-2 border-black bg-white p-2 text-black shadow-sm transition-shadow hover:shadow-md">
			{/* Status Overlays */}
			{isSaving && (
				<div className="absolute top-1 right-1">
					<Loader2 className="h-3 w-3 animate-spin text-gray-400" />
				</div>
			)}
			{!isSaving && isSaved && (
				<div className="absolute top-1 right-1">
					<Check className="h-3 w-3 text-green-500" />
				</div>
			)}

			<div className="flex h-10 w-10 flex-shrink-0 items-center justify-center border border-black bg-gray-50">
				<TeamLogo teamName={team.name} logoUrl={team.logoUrl} size="sm" />
			</div>
			<div className="min-w-0 flex-1">
				<div
					className="max-w-full truncate font-bold text-black text-xs uppercase"
					title={team.name}
				>
					{team.name}
				</div>
				<div className="mt-1 flex gap-2">
					<select
						value={team.group || ""}
						onChange={(e) => onUpdate(team.id, "group", e.target.value || null)}
						className="h-6 w-16 cursor-pointer border border-black bg-gray-50 px-1 font-bold text-[10px] text-black uppercase hover:bg-gray-100"
						disabled={isSaving}
					>
						<option value="">- Grp -</option>
						{availableGroups.map((g) => (
							<option key={g} value={g}>
								{g}
							</option>
						))}
					</select>
					<select
						value={team.seed || ""}
						onChange={(e) =>
							onUpdate(
								team.id,
								"seed",
								e.target.value ? Number(e.target.value) : null,
							)
						}
						className="h-6 w-16 cursor-pointer border border-black bg-gray-50 px-1 font-bold text-[10px] text-black uppercase hover:bg-gray-100"
						disabled={isSaving}
					>
						<option value="">- Seed -</option>
						{SEEDS.slice(0, maxTeamsPerGroup || 4).map((s) => (
							<option key={s} value={s}>
								{s}
							</option>
						))}
					</select>
				</div>
			</div>
		</div>
	);
}
