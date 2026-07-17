import clsx from "clsx";
import { Plus, Settings, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { CustomDatePicker, CustomSelect } from "./CustomInputs";

// Re-using the types from the schema/validation
export type StageType =
	| "Single Elimination"
	| "Double Elimination"
	| "Groups"
	| "Swiss";
export type MatchType = "Bo1" | "Bo3" | "Bo5";

export interface Stage {
	id: string;
	name: string;
	type: StageType;
	settings: {
		groupsCount?: number;
		teamsPerGroup?: number;
		advancingCount?: number;
		matchType?: MatchType;
		groupFormat?: "GSL" | "Round Robin";
		participantsCount?: number;
		winsToAdvance?: number;
		lossesToEliminate?: number;
		roundsMax?: number;
		enableThirdPlaceMatch?: boolean;
	};
	startDate?: string;
	endDate?: string;
	scoringRules?: {
		winner: number;
		exact: number;
		underdog_25: number;
		underdog_50: number;
		underdog_tier1_max_pct?: number;
		underdog_tier2_max_pct?: number;
	};
}

interface StageBuilderProps {
	stages: Stage[];
	onChange: (stages: Stage[]) => void;
}

const fieldLabelClass =
	"mb-1 block font-body font-bold text-[10px] text-gray-500 uppercase leading-tight tracking-widest";

const numberInputClass =
	"h-10 w-full border-[3px] border-black bg-white px-2.5 font-body font-bold text-black text-sm tabular-nums shadow-[3px_3px_0px_0px_rgba(0,0,0,0.1)] focus:outline-none focus:ring-2 focus:ring-electric-lime";

const selectTriggerClass =
	"h-10 min-h-10 px-2.5 font-display text-xs uppercase shadow-[3px_3px_0px_0px_rgba(0,0,0,0.1)]";

const scoringInputClass =
	"h-10 w-full border-2 border-black bg-white px-2.5 font-body font-bold text-black text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-electric-lime";

export const StageBuilder = ({ stages, onChange }: StageBuilderProps) => {
	const { t } = useTranslation("admin-matches");
	const addStage = () => {
		const newStage: Stage = {
			id: crypto.randomUUID(),
			name: t("stageBuilder.defaultName", { number: stages.length + 1 }),
			type: "Single Elimination",
			settings: {
				matchType: "Bo3",
			},
		};
		onChange([...stages, newStage]);
	};

	const removeStage = (index: number) => {
		const newStages = [...stages];
		newStages.splice(index, 1);
		onChange(newStages);
	};

	const updateStage = (index: number, field: keyof Stage, value: any) => {
		const newStages = [...stages];
		newStages[index] = { ...newStages[index], [field]: value };
		onChange(newStages);
	};

	const updateSettings = (index: number, field: string, value: any) => {
		const newStages = [...stages];
		newStages[index] = {
			...newStages[index],
			settings: { ...newStages[index].settings, [field]: value },
		};
		onChange(newStages);
	};

	return (
		<div className="flex flex-col gap-4">
			<div className="flex items-center justify-between gap-3">
				<label className="ml-1 block font-body font-bold text-black text-xs uppercase tracking-widest">
					{t("stageBuilder.title")}
				</label>
				<button
					type="button"
					onClick={addStage}
					className="flex shrink-0 items-center gap-1 bg-black px-2 py-1 font-black font-display text-white text-xs uppercase transition-colors hover:bg-[#ccff00] hover:text-black"
				>
					<Plus className="h-3 w-3" /> {t("stageBuilder.addStage")}
				</button>
			</div>

			<div className="flex flex-col gap-3">
				{stages.map((stage, index) => (
					<div
						key={stage.id}
						className="group relative border-[3px] border-black bg-gray-50 p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]"
					>
						<div className="absolute top-2 right-2 z-10">
							<button
								type="button"
								onClick={() => removeStage(index)}
								className="text-gray-400 transition-colors hover:text-[#ff2e2e]"
								aria-label={t("common:actions.delete")}
							>
								<Trash2 className="h-4 w-4" />
							</button>
						</div>

						{/* Identity */}
						<div className="mb-4 grid grid-cols-1 gap-3 pr-8 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
							<div className="min-w-0">
								<label className={fieldLabelClass}>
									{t("stageBuilder.stageName")}
								</label>
								<input
									type="text"
									value={stage.name}
									onChange={(e) => updateStage(index, "name", e.target.value)}
									className={numberInputClass}
									placeholder={t("stageBuilder.stageNamePlaceholder")}
								/>
							</div>
							<div className="min-w-0">
								<label className={fieldLabelClass}>
									{t("stageBuilder.type")}
								</label>
								<CustomSelect
									value={stage.type}
									onChange={(val) => updateStage(index, "type", val)}
									searchable={false}
									size="compact"
									triggerClassName={selectTriggerClass}
									options={[
										{
											value: "Single Elimination",
											label: t("stageBuilder.singleElimination"),
										},
										{
											value: "Double Elimination",
											label: t("stageBuilder.doubleElimination"),
										},
										{ value: "Groups", label: t("stageBuilder.groups") },
										{ value: "Swiss", label: t("stageBuilder.swiss") },
									]}
								/>
							</div>
						</div>

						{/* Settings */}
						<div className="mb-4 border-2 border-black/15 bg-white p-3">
							<div className="mb-3 flex items-center gap-2 text-gray-400">
								<Settings className="h-3 w-3 shrink-0" />
								<span className="font-body font-bold text-[10px] uppercase tracking-widest">
									{t("stageBuilder.settings")}
								</span>
							</div>

							<div className="flex flex-col gap-3">
								{/* Selects: match type (+ format for Groups) */}
								<div
									className={clsx(
										"grid gap-3",
										stage.type === "Groups"
											? "grid-cols-1 sm:grid-cols-2"
											: "grid-cols-1",
									)}
								>
									<div className="min-w-0">
										<label className={fieldLabelClass}>
											{t("stageBuilder.matchType")}
										</label>
										<CustomSelect
											value={stage.settings.matchType || "Bo3"}
											onChange={(val) =>
												updateSettings(index, "matchType", val)
											}
											searchable={false}
											size="compact"
											triggerClassName={selectTriggerClass}
											options={[
												{ value: "Bo1", label: t("stageBuilder.bestOf1") },
												{ value: "Bo3", label: t("stageBuilder.bestOf3") },
												{ value: "Bo5", label: t("stageBuilder.bestOf5") },
											]}
										/>
									</div>

									{stage.type === "Groups" && (
										<div className="min-w-0">
											<label className={fieldLabelClass}>
												{t("stageBuilder.format")}
											</label>
											<CustomSelect
												value={stage.settings.groupFormat || "GSL"}
												onChange={(val) =>
													updateSettings(index, "groupFormat", val)
												}
												searchable={false}
												size="compact"
												triggerClassName={selectTriggerClass}
												options={[
													{ value: "GSL", label: t("stageBuilder.gsl") },
													{
														value: "Round Robin",
														label: t("stageBuilder.roundRobin"),
													},
												]}
											/>
										</div>
									)}
								</div>

								{stage.type === "Groups" && (
									<div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
										<div className="min-w-0">
											<label className={fieldLabelClass}>
												{t("stageBuilder.groupsCount")}
											</label>
											<input
												type="number"
												min={1}
												value={stage.settings.groupsCount || ""}
												onChange={(e) =>
													updateSettings(
														index,
														"groupsCount",
														Number.parseInt(e.target.value) || 0,
													)
												}
												className={numberInputClass}
												placeholder={t("stageBuilder.groupsCountPlaceholder")}
											/>
										</div>
										<div className="min-w-0">
											<label className={fieldLabelClass}>
												{t("stageBuilder.teamsPerGroup")}
											</label>
											<input
												type="number"
												min={2}
												value={stage.settings.teamsPerGroup || ""}
												onChange={(e) =>
													updateSettings(
														index,
														"teamsPerGroup",
														Number.parseInt(e.target.value) || 0,
													)
												}
												className={numberInputClass}
												placeholder={t("stageBuilder.teamsPerGroupPlaceholder")}
											/>
										</div>
										<div className="min-w-0">
											<label className={fieldLabelClass}>
												{t("stageBuilder.topNAdvance")}
											</label>
											<input
												type="number"
												min={1}
												value={stage.settings.advancingCount || ""}
												onChange={(e) =>
													updateSettings(
														index,
														"advancingCount",
														Number.parseInt(e.target.value) || 0,
													)
												}
												className={numberInputClass}
												placeholder={t("stageBuilder.topNAdvancePlaceholder")}
											/>
										</div>
									</div>
								)}

								{stage.type === "Swiss" && (
									<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
										<div className="min-w-0">
											<label className={fieldLabelClass}>
												{t("stageBuilder.participants")}
											</label>
											<input
												type="number"
												min={2}
												value={stage.settings.participantsCount || ""}
												onChange={(e) =>
													updateSettings(
														index,
														"participantsCount",
														Number.parseInt(e.target.value) || 0,
													)
												}
												className={numberInputClass}
												placeholder="8"
											/>
										</div>
										<div className="min-w-0">
											<label className={fieldLabelClass}>
												{t("stageBuilder.winsToAdvance")}
											</label>
											<input
												type="number"
												min={1}
												value={stage.settings.winsToAdvance || ""}
												onChange={(e) =>
													updateSettings(
														index,
														"winsToAdvance",
														Number.parseInt(e.target.value) || 0,
													)
												}
												className={numberInputClass}
												placeholder="2"
											/>
										</div>
										<div className="min-w-0">
											<label className={fieldLabelClass}>
												{t("stageBuilder.lossesToEliminate")}
											</label>
											<input
												type="number"
												min={1}
												value={stage.settings.lossesToEliminate || ""}
												onChange={(e) =>
													updateSettings(
														index,
														"lossesToEliminate",
														Number.parseInt(e.target.value) || 0,
													)
												}
												className={numberInputClass}
												placeholder="2"
											/>
										</div>
										<div className="min-w-0">
											<label className={fieldLabelClass}>
												{t("stageBuilder.maxRounds")}
											</label>
											<input
												type="number"
												min={1}
												value={stage.settings.roundsMax || ""}
												onChange={(e) =>
													updateSettings(
														index,
														"roundsMax",
														Number.parseInt(e.target.value) || 0,
													)
												}
												className={numberInputClass}
												placeholder="3"
											/>
										</div>
										<div className="min-w-0 sm:col-span-2">
											<label className={fieldLabelClass}>
												{t("stageBuilder.playoffAdvance")}
											</label>
											<input
												type="number"
												min={1}
												value={stage.settings.advancingCount || ""}
												onChange={(e) =>
													updateSettings(
														index,
														"advancingCount",
														Number.parseInt(e.target.value) || 0,
													)
												}
												className={numberInputClass}
												placeholder="4"
											/>
										</div>
									</div>
								)}

								{stage.type === "Single Elimination" && (
									<div className="flex items-center gap-3 border-2 border-black/20 border-dashed bg-paper p-3">
										<button
											type="button"
											onClick={() =>
												updateSettings(
													index,
													"enableThirdPlaceMatch",
													!stage.settings.enableThirdPlaceMatch,
												)
											}
											className={clsx(
												"h-6 w-12 shrink-0 rounded-full border-2 border-black transition-colors",
												stage.settings.enableThirdPlaceMatch
													? "bg-[#ccff00]"
													: "bg-white",
											)}
											aria-pressed={!!stage.settings.enableThirdPlaceMatch}
										>
											<div
												className={clsx(
													"h-4 w-4 rounded-full border-2 border-black bg-white transition-transform",
													stage.settings.enableThirdPlaceMatch
														? "translate-x-6"
														: "translate-x-0.5",
												)}
											/>
										</button>
										<div className="min-w-0">
											<label className="block font-body font-bold text-[10px] text-ink uppercase tracking-widest">
												{t("stageBuilder.thirdPlaceMatch")}
											</label>
											<p className="font-body text-[9px] text-gray-500 leading-snug">
												{t("stageBuilder.thirdPlaceMatchHelp")}
											</p>
										</div>
									</div>
								)}
							</div>
						</div>

						{/* Dates */}
						<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
							<CustomDatePicker
								label={t("stageBuilder.startDate")}
								value={stage.startDate || ""}
								onChange={(val) => updateStage(index, "startDate", val)}
							/>
							<CustomDatePicker
								label={t("stageBuilder.endDate")}
								value={stage.endDate || ""}
								onChange={(val) => updateStage(index, "endDate", val)}
							/>
						</div>

						{/* Scoring overrides */}
						<div className="mt-4 border-2 border-black/15 bg-white p-3">
							<div className="mb-3 flex items-center gap-2 text-gray-400">
								<Settings className="h-3 w-3 shrink-0" />
								<span className="font-body font-bold text-[10px] uppercase tracking-widest">
									{t("stageBuilder.scoringOverrides")}
								</span>
							</div>
							<div className="grid grid-cols-2 gap-3">
								<div className="min-w-0">
									<label className={fieldLabelClass}>
										{t("stageBuilder.winnerPts")}
									</label>
									<input
										type="number"
										step="0.1"
										value={stage.scoringRules?.winner ?? ""}
										onChange={(e) => {
											const val = e.target.value
												? Number.parseFloat(e.target.value)
												: undefined;
											const currentRules = stage.scoringRules || {
												winner: 1,
												exact: 3,
												underdog_25: 2,
												underdog_50: 1,
											};
											if (val === undefined) {
												updateStage(index, "scoringRules", undefined);
											} else {
												updateStage(index, "scoringRules", {
													...currentRules,
													winner: val,
												});
											}
										}}
										className={scoringInputClass}
										placeholder={t("stageBuilder.default")}
									/>
								</div>
								<div className="min-w-0">
									<label className={fieldLabelClass}>
										{t("stageBuilder.exactPts")}
									</label>
									<input
										type="number"
										step="0.1"
										value={stage.scoringRules?.exact ?? ""}
										onChange={(e) => {
											const val = e.target.value
												? Number.parseFloat(e.target.value)
												: undefined;
											const currentRules = stage.scoringRules || {
												winner: 1,
												exact: 3,
												underdog_25: 2,
												underdog_50: 1,
											};
											updateStage(index, "scoringRules", {
												...currentRules,
												exact: val ?? 3,
											});
										}}
										className={scoringInputClass}
										placeholder={t("stageBuilder.default")}
									/>
								</div>
								<div className="min-w-0">
									<label
										className={fieldLabelClass}
										title={t("stageBuilder.underdogT1Tooltip")}
									>
										{t("stageBuilder.underdogT1")}
									</label>
									<input
										type="number"
										step="0.1"
										value={stage.scoringRules?.underdog_25 ?? ""}
										onChange={(e) => {
											const val = e.target.value
												? Number.parseFloat(e.target.value)
												: undefined;
											const currentRules = stage.scoringRules || {
												winner: 1,
												exact: 3,
												underdog_25: 2,
												underdog_50: 1,
											};
											updateStage(index, "scoringRules", {
												...currentRules,
												underdog_25: val ?? 2,
											});
										}}
										className={scoringInputClass}
										placeholder={t("stageBuilder.default")}
									/>
								</div>
								<div className="min-w-0">
									<label
										className={fieldLabelClass}
										title={t("stageBuilder.underdogT2Tooltip")}
									>
										{t("stageBuilder.underdogT2")}
									</label>
									<input
										type="number"
										step="0.1"
										value={stage.scoringRules?.underdog_50 ?? ""}
										onChange={(e) => {
											const val = e.target.value
												? Number.parseFloat(e.target.value)
												: undefined;
											const currentRules = stage.scoringRules || {
												winner: 1,
												exact: 3,
												underdog_25: 2,
												underdog_50: 1,
											};
											updateStage(index, "scoringRules", {
												...currentRules,
												underdog_50: val ?? 1,
											});
										}}
										className={scoringInputClass}
										placeholder={t("stageBuilder.default")}
									/>
								</div>
							</div>
						</div>

						{index < stages.length - 1 && (
							<div className="absolute -bottom-7 left-1/2 flex -translate-x-1/2 flex-col items-center">
								<div className="h-3 w-[2px] bg-black" />
								<div className="text-black text-xs">▼</div>
							</div>
						)}
					</div>
				))}

				{stages.length === 0 && (
					<div className="rounded-sm border-2 border-gray-300 border-dashed p-8 text-center">
						<p className="font-black font-display text-gray-400 text-sm uppercase">
							{t("stageBuilder.emptyState")}
						</p>
						<p className="font-body text-gray-300 text-xs">
							{t("stageBuilder.emptyStateHint")}
						</p>
					</div>
				)}
			</div>
		</div>
	);
};
