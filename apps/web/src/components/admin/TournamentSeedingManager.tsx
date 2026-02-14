import { useState } from "react";
import { updateTeamSeeding } from "@/server/tournament-teams";
import { toast } from "sonner";
import { Loader2, Check } from "lucide-react";

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
      <div className="flex justify-between items-center bg-white border-[4px] border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]">
        <div>
          <h2 className="font-black italic uppercase text-2xl text-black">
            Seeding Manager
          </h2>
          <p className="text-gray-500 text-sm font-bold">
            Assign teams to groups and seeds. Changes are saved automatically.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Global Status Indicator could go here */}
          {savingTeams.size > 0 && (
            <div className="flex items-center gap-2 text-xs font-bold uppercase text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving {savingTeams.size} changes...
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Unassigned Teams */}
        {groupedTeams["Unassigned"]?.length > 0 && (
          <div className="lg:col-span-2 bg-gray-100 border-2 border-dashed border-black/20 p-4">
            <h3 className="font-black uppercase text-gray-400 mb-4">
              Unassigned Teams
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
            className="bg-white border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col"
          >
            <div className="bg-black text-white px-4 py-2 font-black uppercase italic flex justify-between items-center">
              <span>Group {group}</span>
              <span className="text-xs font-normal not-italic text-gray-400">
                {(groupedTeams[group] || []).length} Teams
              </span>
            </div>
            <div className="p-4 flex flex-col gap-3">
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
                <div className="text-center py-8 text-gray-300 font-bold uppercase text-xs">
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
    <div className="bg-white border-2 border-black p-2 flex items-center gap-3 shadow-sm hover:shadow-md transition-shadow text-black relative">
      {/* Status Overlays */}
      {isSaving && (
        <div className="absolute top-1 right-1">
          <Loader2 className="w-3 h-3 text-gray-400 animate-spin" />
        </div>
      )}
      {!isSaving && isSaved && (
        <div className="absolute top-1 right-1">
          <Check className="w-3 h-3 text-green-500" />
        </div>
      )}

      <div className="w-10 h-10 border border-black p-1 flex items-center justify-center bg-gray-50 flex-shrink-0">
        {team.logoUrl ? (
          <img src={team.logoUrl} className="w-full h-full object-contain" />
        ) : (
          <span className="text-xs font-bold text-gray-300">?</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div
          className="font-bold uppercase text-xs truncate max-w-full text-black"
          title={team.name}
        >
          {team.name}
        </div>
        <div className="flex gap-2 mt-1">
          <select
            value={team.group || ""}
            onChange={(e) => onUpdate(team.id, "group", e.target.value || null)}
            className="bg-gray-50 border border-black text-[10px] font-bold uppercase h-6 w-16 px-1 text-black cursor-pointer hover:bg-gray-100"
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
            className="bg-gray-50 border border-black text-[10px] font-bold uppercase h-6 w-16 px-1 text-black cursor-pointer hover:bg-gray-100"
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
