import { useMemo, useState } from 'react';
import type { Team, TeamId } from '@/types/domain.ts';

export interface TeamSelection {
  rosters: boolean;
  configs: boolean;
  history: boolean;
}

type SelectionField = keyof TeamSelection;

const ALL_SELECTED: TeamSelection = { rosters: true, configs: true, history: true };
const NONE_SELECTED: TeamSelection = { rosters: false, configs: false, history: false };

function initSelections(teams: Team[]): Record<TeamId, TeamSelection> {
  const selections: Record<TeamId, TeamSelection> = {};
  for (const team of teams) {
    selections[team.id] = { ...ALL_SELECTED };
  }
  return selections;
}

export function useSelectionState(teams: Team[]) {
  const [selections, setSelections] = useState(() => initSelections(teams));

  function toggleField(teamId: TeamId, field: SelectionField) {
    setSelections((prev) => ({
      ...prev,
      [teamId]: { ...prev[teamId], [field]: !prev[teamId][field] },
    }));
  }

  function getTeamState(teamId: TeamId): boolean | 'indeterminate' {
    const sel = selections[teamId];
    if (!sel) return false;
    const values = [sel.rosters, sel.configs, sel.history];
    if (values.every(Boolean)) return true;
    if (values.every((v) => !v)) return false;
    return 'indeterminate';
  }

  function toggleTeam(teamId: TeamId) {
    const state = getTeamState(teamId);
    setSelections((prev) => ({
      ...prev,
      [teamId]: state === true ? { ...NONE_SELECTED } : { ...ALL_SELECTED },
    }));
  }

  function selectAll() {
    setSelections((prev) => {
      const next = { ...prev };
      for (const id of Object.keys(next)) next[id] = { ...ALL_SELECTED };
      return next;
    });
  }

  function clearAll() {
    setSelections((prev) => {
      const next = { ...prev };
      for (const id of Object.keys(next)) next[id] = { ...NONE_SELECTED };
      return next;
    });
  }

  const hasAnySelected = useMemo(
    () => Object.values(selections).some((s) => s.rosters || s.configs || s.history),
    [selections],
  );

  return { selections, toggleField, getTeamState, toggleTeam, selectAll, clearAll, hasAnySelected };
}
