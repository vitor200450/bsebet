import { Plus, Trash2, Settings } from "lucide-react";
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
        <label className="block text-xs font-black uppercase ml-1 text-black">
          Tournament Stages Flow
        </label>
        <button
          type="button"
          onClick={addStage}
          className="text-xs font-bold uppercase bg-black text-white px-2 py-1 hover:bg-[#ccff00] hover:text-black transition-colors flex items-center gap-1"
        >
          <Plus className="w-3 h-3" /> Add Stage
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {stages.map((stage, index) => (
          <div
            key={stage.id}
            className="border-[3px] border-black p-4 bg-gray-50 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] relative group"
          >
            <div className="absolute top-2 right-2">
              <button
                type="button"
                onClick={() => removeStage(index)}
                className="text-gray-400 hover:text-[#ff2e2e] transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 pr-6">
              <div>
                <label className="block text-[10px] font-bold uppercase mb-1 text-gray-500">
                  Stage Name
                </label>
                <input
                  type="text"
                  value={stage.name}
                  onChange={(e) => updateStage(index, "name", e.target.value)}
                  className="w-full border-2 border-black p-1 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#ccff00] bg-white text-black"
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
            <div className="bg-white border-2 border-gray-200 p-3 mb-4">
              <div className="flex items-center gap-2 mb-2 text-gray-400">
                <Settings className="w-3 h-3" />
                <span className="text-[10px] font-bold uppercase">
                  Settings
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
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
                      <label className="block text-[10px] font-bold uppercase mb-1 text-gray-500">
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
                            parseInt(e.target.value) || 0,
                          )
                        }
                        className="w-full border-2 border-black p-1 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#ccff00] bg-white text-black"
                        placeholder="e.g. 4"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase mb-1 text-gray-500">
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
                            parseInt(e.target.value) || 0,
                          )
                        }
                        className="w-full border-2 border-black p-1 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#ccff00] bg-white text-black"
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
            <div className="bg-white border-2 border-gray-200 p-3 mt-4">
              <div className="flex items-center gap-2 mb-2 text-gray-400">
                <Settings className="w-3 h-3" />
                <span className="text-[10px] font-bold uppercase">
                  Scoring Overrides (Optional)
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold uppercase mb-1 text-gray-500">
                    Winner Pts
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={stage.scoringRules?.winner ?? ""}
                    onChange={(e) => {
                      const val = e.target.value
                        ? parseFloat(e.target.value)
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
                    className="w-full border-2 border-gray-300 p-1 text-xs focus:outline-none focus:border-black bg-white text-black"
                    placeholder="Default"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase mb-1 text-gray-500">
                    Exact Pts
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={stage.scoringRules?.exact ?? ""}
                    onChange={(e) => {
                      const val = e.target.value
                        ? parseFloat(e.target.value)
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
                    className="w-full border-2 border-gray-300 p-1 text-xs focus:outline-none focus:border-black bg-white text-black"
                    placeholder="Default"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase mb-1 text-gray-500" title="Bonus for underdog with ≤25% of votes">
                    Underdog T1 (≤25%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={stage.scoringRules?.underdog_25 ?? ""}
                    onChange={(e) => {
                      const val = e.target.value
                        ? parseFloat(e.target.value)
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
                    className="w-full border-2 border-gray-300 p-1 text-xs focus:outline-none focus:border-black bg-white text-black"
                    placeholder="Default"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase mb-1 text-gray-500" title="Bonus for underdog with 26-50% of votes">
                    Underdog T2 (26-50%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={stage.scoringRules?.underdog_50 ?? ""}
                    onChange={(e) => {
                      const val = e.target.value
                        ? parseFloat(e.target.value)
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
                    className="w-full border-2 border-gray-300 p-1 text-xs focus:outline-none focus:border-black bg-white text-black"
                    placeholder="Default"
                  />
                </div>
              </div>
            </div>

            {/* Visual connector to next stage */}
            {index < stages.length - 1 && (
              <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 flex flex-col items-center">
                <div className="w-[2px] h-3 bg-black"></div>
                <div className="text-black text-xs">▼</div>
              </div>
            )}
          </div>
        ))}

        {stages.length === 0 && (
          <div className="text-center p-8 border-2 border-dashed border-gray-300 rounded-sm">
            <p className="text-gray-400 text-sm font-bold uppercase">
              No stages defined
            </p>
            <p className="text-gray-300 text-xs">Click "Add Stage" to begin</p>
          </div>
        )}
      </div>
    </div>
  );
};
