import { Plus, Settings, Trash2 } from "lucide-react";
import { CustomDatePicker, CustomSelect } from "./CustomInputs";

// Re-using the types from the schema/validation
export type StageType = "Single Elimination" | "Double Elimination" | "Groups";
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
	};
	startDate?: string;
	endDate?: string;
	scoringRules?: {
		winner: number;
		exact: number;
		underdog_25: number;
		underdog_50: number;
	};
}

interface StageBuilderProps {
	stages: Stage[];
	onChange: (stages: Stage[]) => void;
}

export const StageBuilder = ({ stages, onChange }: StageBuilderProps) => {
	const addStage = () => {
		const newStage: Stage = {
			id: crypto.randomUUID(),
			name: `Stage ${stages.length + 1}`,
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
			<div className="flex items-center justify-between">
				<label className="ml-1 block font-black text-black text-xs uppercase">
					Tournament Stages Flow
				</label>
				<button
					type="button"
					onClick={addStage}
					className="flex items-center gap-1 bg-black px-2 py-1 font-bold text-white text-xs uppercase transition-colors hover:bg-[#ccff00] hover:text-black"
				>
					<Plus className="h-3 w-3" /> Add Stage
				</button>
			</div>

			<div className="flex flex-col gap-3">
				{stages.map((stage, index) => (
					<div
						key={stage.id}
						className="group relative border-[3px] border-black bg-gray-50 p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]"
					>
						<div className="absolute top-2 right-2">
							<button
								type="button"
								onClick={() => removeStage(index)}
								className="text-gray-400 transition-colors hover:text-[#ff2e2e]"
							>
								<Trash2 className="h-4 w-4" />
							</button>
						</div>

						<div className="mb-4 grid grid-cols-1 gap-4 pr-6 md:grid-cols-2">
							<div>
								<label className="mb-1 block font-bold text-[10px] text-gray-500 uppercase">
									Stage Name
								</label>
								<input
									type="text"
									value={stage.name}
									onChange={(e) => updateStage(index, "name", e.target.value)}
									className="w-full border-2 border-black bg-white p-1 font-bold text-black text-sm focus:outline-none focus:ring-2 focus:ring-[#ccff00]"
									placeholder="e.g. Group Stage"
								/>
							</div>
							<CustomSelect
								label="Type"
								value={stage.type}
								onChange={(val) => updateStage(index, "type", val)}
								options={[
									{ value: "Single Elimination", label: "Single Elimination" },
									{ value: "Double Elimination", label: "Double Elimination" },
									{ value: "Groups", label: "Groups" },
								]}
							/>
						</div>

						{/* Settings Section */}
						<div className="mb-4 border-2 border-gray-200 bg-white p-3">
							<div className="mb-2 flex items-center gap-2 text-gray-400">
								<Settings className="h-3 w-3" />
								<span className="font-bold text-[10px] uppercase">
									Settings
								</span>
							</div>

							<div className="grid grid-cols-2 gap-2 md:grid-cols-4">
								<CustomSelect
									label="Match Type"
									value={stage.settings.matchType || "Bo3"}
									onChange={(val) => updateSettings(index, "matchType", val)}
									options={[
										{ value: "Bo1", label: "Best of 1" },
										{ value: "Bo3", label: "Best of 3" },
										{ value: "Bo5", label: "Best of 5" },
									]}
								/>

								{stage.type === "Groups" && (
									<>
										<CustomSelect
											label="Format"
											value={stage.settings.groupFormat || "GSL"}
											onChange={(val) =>
												updateSettings(index, "groupFormat", val)
											}
											options={[
												{ value: "GSL", label: "GSL" },
												{ value: "Round Robin", label: "Round Robin" },
											]}
										/>
										<div>
											<label className="mb-1 block font-bold text-[10px] text-gray-500 uppercase">
												Groups Count
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
												className="w-full border-2 border-black bg-white p-1 font-bold text-black text-sm focus:outline-none focus:ring-2 focus:ring-[#ccff00]"
												placeholder="e.g. 4"
											/>
										</div>
										<div>
											<label className="mb-1 block font-bold text-[10px] text-gray-500 uppercase">
												Teams / Group
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
												className="w-full border-2 border-black bg-white p-1 font-bold text-black text-sm focus:outline-none focus:ring-2 focus:ring-[#ccff00]"
												placeholder="e.g. 4"
											/>
										</div>
									</>
								)}
							</div>
						</div>

						{/* Dates Grid */}
						<div className="grid grid-cols-2 gap-4">
							<CustomDatePicker
								label="Start Date"
								value={stage.startDate || ""}
								onChange={(val) => updateStage(index, "startDate", val)}
							/>
							<CustomDatePicker
								label="End Date"
								value={stage.endDate || ""}
								onChange={(val) => updateStage(index, "endDate", val)}
							/>
						</div>

						{/* SCORING OVERRIDES */}
						<div className="mt-4 border-2 border-gray-200 bg-white p-3">
							<div className="mb-2 flex items-center gap-2 text-gray-400">
								<Settings className="h-3 w-3" />
								<span className="font-bold text-[10px] uppercase">
									Scoring Overrides (Optional)
								</span>
							</div>
							<div className="grid grid-cols-2 gap-2">
								<div>
									<label className="mb-1 block font-bold text-[10px] text-gray-500 uppercase">
										Winner Pts
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
										className="w-full border-2 border-gray-300 bg-white p-1 text-black text-xs focus:border-black focus:outline-none"
										placeholder="Default"
									/>
								</div>
								<div>
									<label className="mb-1 block font-bold text-[10px] text-gray-500 uppercase">
										Exact Pts
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
										className="w-full border-2 border-gray-300 bg-white p-1 text-black text-xs focus:border-black focus:outline-none"
										placeholder="Default"
									/>
								</div>
								<div>
									<label
										className="mb-1 block font-bold text-[10px] text-gray-500 uppercase"
										title="Bonus for underdog with ≤25% of votes"
									>
										Underdog T1 (≤25%)
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
										className="w-full border-2 border-gray-300 bg-white p-1 text-black text-xs focus:border-black focus:outline-none"
										placeholder="Default"
									/>
								</div>
								<div>
									<label
										className="mb-1 block font-bold text-[10px] text-gray-500 uppercase"
										title="Bonus for underdog with 26-50% of votes"
									>
										Underdog T2 (26-50%)
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
										className="w-full border-2 border-gray-300 bg-white p-1 text-black text-xs focus:border-black focus:outline-none"
										placeholder="Default"
									/>
								</div>
							</div>
						</div>

						{/* Visual connector to next stage */}
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
						<p className="font-bold text-gray-400 text-sm uppercase">
							No stages defined
						</p>
						<p className="text-gray-300 text-xs">Click "Add Stage" to begin</p>
					</div>
				)}
			</div>
		</div>
	);
};
