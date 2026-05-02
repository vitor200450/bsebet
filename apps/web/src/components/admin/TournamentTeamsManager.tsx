import { Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { CustomSelect } from "./CustomInputs";

interface Team {
	id: number;
	name: string;
	logoUrl: string | null;
	region: string | null;
}

interface TournamentTeamsManagerProps {
	teams: Team[];
	allTeams: Team[];
	onAddTeam: (teamId: number) => void;
	onRemoveTeam: (teamId: number) => void;
	tournamentRegion?: string | null;
}

const getRegionColor = (region: string) => {
	switch (region) {
		case "NA":
			return "bg-[#2e5cff] text-white shadow-[1px_1px_0px_0px_#000]";
		case "EMEA":
			return "bg-[#9b59b6] text-white shadow-[1px_1px_0px_0px_#000]";
		case "CN":
			return "bg-[#ff2e2e] text-white shadow-[1px_1px_0px_0px_#000]";
		case "EA":
			return "bg-[#ff9f43] text-black shadow-[1px_1px_0px_0px_#000]";
		case "SEA":
			return "bg-[#1dd1a1] text-black shadow-[1px_1px_0px_0px_#000]";
		case "SA":
		default:
			return "bg-[#ffc700] text-black shadow-[1px_1px_0px_0px_#000]";
	}
};

export function TournamentTeamsManager({
	teams,
	allTeams,
	onAddTeam,
	onRemoveTeam,
	tournamentRegion,
}: TournamentTeamsManagerProps) {
	const { t } = useTranslation("admin-matches");
	const [selectedTeamId, setSelectedTeamId] = useState<string>("");
	const [pendingTeamIds, setPendingTeamIds] = useState<string[]>([]);
	const [sortOrder, setSortOrder] = useState<"name" | "region" | "recent">(
		"name",
	);
	const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);

	useEffect(() => {
		if (pendingTeamIds.length > 0) {
			const stillPending = pendingTeamIds.filter(
				(id) => !teams.some((t) => t.id === Number(id)),
			);
			if (stillPending.length !== pendingTeamIds.length) {
				setPendingTeamIds(stillPending);
			}
		}
	}, [teams, pendingTeamIds]);

	const allDisplayedTeams = [
		...teams,
		...allTeams.filter(
			(t) =>
				pendingTeamIds.includes(String(t.id)) &&
				!teams.some((existing) => existing.id === t.id),
		),
	].sort((a, b) => {
		if (sortOrder === "name") return a.name.localeCompare(b.name);
		if (sortOrder === "region")
			return (a.region || "").localeCompare(b.region || "");
		if (sortOrder === "recent") return b.id - a.id;
		return 0;
	});

	const availableTeams = allTeams.filter((t) => {
		const isAlreadyAdded = allDisplayedTeams.some((at) => at.id === t.id);
		if (isAlreadyAdded) return false;
		if (
			tournamentRegion &&
			tournamentRegion !== "Global" &&
			t.region !== tournamentRegion
		) {
			return false;
		}
		return true;
	});

	const handleAdd = (idOverride?: string) => {
		const idToAdd = idOverride || selectedTeamId;
		if (!idToAdd) return;
		setPendingTeamIds((prev) => [...prev, idToAdd]);
		onAddTeam(Number(idToAdd));
		setSelectedTeamId("");
	};

	return (
		<div className="space-y-6">
			<div className="flex items-end gap-4 border-2 border-black bg-gray-50 p-4">
				<div className="flex-1">
					<label className="mb-1 ml-1 block font-black text-black text-xs uppercase">
						{t("teams.addTitle")}
					</label>
					<CustomSelect
						label={t("teams.selectTeam")}
						value={selectedTeamId}
						onChange={setSelectedTeamId}
						onConfirm={handleAdd}
						options={availableTeams.map((team) => ({
							value: String(team.id),
							label: team.name,
						}))}
					/>
				</div>
				<button
					onClick={() => handleAdd()}
					disabled={!selectedTeamId}
					className="flex h-[46px] items-center gap-2 border-[3px] border-black bg-[#ccff00] px-6 py-2 font-black text-black text-sm uppercase shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all hover:bg-[#bbe000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:bg-gray-200 disabled:text-gray-400"
				>
					<Plus className="h-5 w-5" strokeWidth={3} />
					{t("teams.addButton")}
				</button>
			</div>

			<div className="border-[4px] border-black bg-white p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.1)]">
				<div className="mb-6 flex items-center justify-between">
					<h3 className="flex items-center gap-2 font-black text-2xl text-black uppercase italic">
						{t("teams.participatingTitle")}
						<span className="rounded-full bg-black px-2 font-bold text-sm text-white not-italic">
							{allDisplayedTeams.length}
						</span>
					</h3>

					<div className="relative z-10">
						<button
							type="button"
							onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
							className="relative flex min-w-[120px] items-center gap-2 border-[3px] border-black bg-white px-4 py-2 pr-10 font-bold text-black text-xs uppercase shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
						>
							<span className="mr-1 text-gray-400">{t("teams.sortLabel")}</span>
							{sortOrder === "recent"
								? t("teams.sortRecent")
								: sortOrder === "name"
									? t("teams.sortAZ")
									: t("teams.sortRegion")}
							<div className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2">
								<span className="text-[10px]">▼</span>
							</div>
						</button>

						{isSortDropdownOpen && (
							<div className="absolute top-full right-0 z-50 mt-1 w-full border-[3px] border-black bg-white py-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
								{[
									{ id: "name", label: t("teams.sortAZ") },
									{ id: "region", label: t("teams.sortRegion") },
									{ id: "recent", label: t("teams.sortRecent") },
								].map((opt) => (
									<button
										key={opt.id}
										onClick={() => {
											setSortOrder(opt.id as any);
											setIsSortDropdownOpen(false);
										}}
										className={`w-full px-4 py-2 text-left font-bold text-black text-xs uppercase transition-colors hover:bg-[#ccff00] ${
											sortOrder === opt.id ? "bg-gray-100" : ""
										}`}
									>
										{opt.label}
									</button>
								))}
							</div>
						)}
					</div>
				</div>

				{allDisplayedTeams.length === 0 ? (
					<div className="border-4 border-gray-100 border-dashed py-12 text-center">
						<p className="font-black text-gray-300 text-xl uppercase">
							{t("teams.emptyState")}
						</p>
					</div>
				) : (
					<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
						{allDisplayedTeams.map((team) => (
							<div
								key={team.id}
								className={`flex items-center justify-between border-[3px] border-black bg-white p-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.05)] transition-colors hover:bg-gray-50 ${pendingTeamIds.includes(String(team.id)) ? "animate-pulse opacity-70" : ""}`}
							>
								<div className="flex items-center gap-3">
									<div className="flex h-10 w-10 items-center justify-center overflow-hidden border-2 border-black bg-gray-100">
										{team.logoUrl ? (
											<img
												src={team.logoUrl}
												alt={team.name}
												className="h-full w-full object-contain p-1"
											/>
										) : (
											<div className="h-full w-full bg-gray-200" />
										)}
									</div>
									<div>
										<h4 className="font-black text-black text-sm uppercase leading-tight">
											{team.name}
										</h4>
										{team.region && (
											<span
												className={`flex w-fit items-center gap-1 rounded-full border-2 border-black px-2 py-0.5 font-bold text-[10px] ${getRegionColor(
													team.region,
												)}`}
											>
												{team.region}
											</span>
										)}
									</div>
								</div>
								<button
									onClick={() => onRemoveTeam(team.id)}
									className="p-2 text-gray-400 transition-colors hover:text-[#ff2e2e]"
									title={t("teams.removeTooltip")}
								>
									<Trash2 className="h-5 w-5" />
								</button>
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	);
}
