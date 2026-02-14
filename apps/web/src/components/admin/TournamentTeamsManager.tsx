import { Trash2, Plus } from "lucide-react";
import { useState, useEffect } from "react";
import { CustomSelect } from "./CustomInputs"; // We might need a "CustomSearchSelect" later, but for now CustomSelect is fine if we fetch all teams.

interface Team {
  id: number;
  name: string;
  logoUrl: string | null;
  region: string | null;
}

interface TournamentTeamsManagerProps {
  teams: Team[]; // Teams already in the tournament
  allTeams: Team[]; // All available teams in the system (for the dropdown)
  onAddTeam: (teamId: number) => void;
  onRemoveTeam: (teamId: number) => void;
  tournamentRegion?: string | null;
}

// Helper for Region Colors (Duplicated from admin/teams.tsx for consistency)
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
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");
  const [pendingTeamIds, setPendingTeamIds] = useState<string[]>([]);
  const [sortOrder, setSortOrder] = useState<"name" | "region" | "recent">(
    "name",
  );
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);

  // Clear pending IDs when the real teams list updates and includes them
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

  // Combine real teams with optimistic teams and sort them
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
    // Recent refers to standard order (insertion order usually, or ID descending if we had it. Here we assume generic order is 'recent' enough or just don't sort)
    // Actually typically 'recent' means newest ID first.
    if (sortOrder === "recent") return b.id - a.id;
    return 0;
  });

  // Filter out teams that are already added (real or pending) AND filter by Region
  const availableTeams = allTeams.filter((t) => {
    const isAlreadyAdded = allDisplayedTeams.some((at) => at.id === t.id);
    if (isAlreadyAdded) return false;

    // Region Restriction Logic
    // If tournamentRegion is provided and NOT "Global", the team must match the region.
    // If tournamentRegion is "Global" or not provided, allow all regions.
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

    // Optimistically add
    setPendingTeamIds((prev) => [...prev, idToAdd]);

    onAddTeam(Number(idToAdd));
    setSelectedTeamId("");
  };

  return (
    <div className="space-y-6">
      {/* Add Team Section */}
      <div className="flex gap-4 items-end bg-gray-50 border-2 border-black p-4">
        <div className="flex-1">
          <label className="block text-xs font-black uppercase mb-1 ml-1 text-black">
            Add Team to Tournament
          </label>
          <CustomSelect
            label="Select Team"
            value={selectedTeamId}
            onChange={setSelectedTeamId}
            onConfirm={handleAdd}
            options={availableTeams.map((t) => ({
              value: String(t.id),
              label: t.name,
            }))}
          />
        </div>
        <button
          onClick={() => handleAdd()}
          disabled={!selectedTeamId}
          className="bg-[#ccff00] hover:bg-[#bbe000] disabled:bg-gray-200 disabled:text-gray-400 text-black px-6 py-2 h-[46px] font-black uppercase text-sm border-[3px] border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all flex items-center gap-2"
        >
          <Plus className="w-5 h-5" strokeWidth={3} />
          Add
        </button>
      </div>

      {/* Teams List */}
      <div className="bg-white border-[4px] border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.1)]">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-black italic uppercase text-2xl flex items-center gap-2 text-black">
            Participating Teams
            <span className="bg-black text-white px-2 text-sm rounded-full not-italic font-bold">
              {allDisplayedTeams.length}
            </span>
          </h3>

          {/* Sort Dropdown */}
          <div className="relative z-10">
            <button
              type="button"
              onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
              className="bg-white border-[3px] border-black px-4 py-2 pr-10 font-bold text-xs uppercase shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all flex items-center gap-2 relative min-w-[120px] text-black"
            >
              <span className="text-gray-400 mr-1">Sort:</span>
              {sortOrder === "recent"
                ? "Recents"
                : sortOrder === "name"
                  ? "A-Z"
                  : "Region"}
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <span className="text-[10px]">▼</span>
              </div>
            </button>

            {isSortDropdownOpen && (
              <div className="absolute top-full right-0 w-full mt-1 bg-white border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] z-50 py-1">
                {[
                  { id: "name", label: "A-Z" },
                  { id: "region", label: "Region" },
                  { id: "recent", label: "Recents" },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => {
                      setSortOrder(opt.id as any);
                      setIsSortDropdownOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-xs font-bold uppercase transition-colors hover:bg-[#ccff00] text-black ${
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
          <div className="text-center py-12 border-4 border-dashed border-gray-100">
            <p className="text-gray-300 font-black uppercase text-xl">
              No teams added yet
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {allDisplayedTeams.map((t) => (
              <div
                key={t.id}
                className={`flex items-center justify-between p-3 border-[3px] border-black bg-white hover:bg-gray-50 transition-colors shadow-[4px_4px_0px_0px_rgba(0,0,0,0.05)] ${pendingTeamIds.includes(String(t.id)) ? "opacity-70 animate-pulse" : ""}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 border-2 border-black bg-gray-100 flex items-center justify-center overflow-hidden">
                    {t.logoUrl ? (
                      <img
                        src={t.logoUrl}
                        alt={t.name}
                        className="w-full h-full object-contain p-1"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-200" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-black uppercase text-sm leading-tight text-black">
                      {t.name}
                    </h4>
                    {t.region && (
                      <span
                        className={`text-[10px] items-center gap-1 font-bold px-2 py-0.5 border-2 border-black rounded-full flex w-fit ${getRegionColor(
                          t.region,
                        )}`}
                      >
                        {t.region}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => onRemoveTeam(t.id)}
                  className="text-gray-400 hover:text-[#ff2e2e] transition-colors p-2"
                  title="Remove from tournament"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
