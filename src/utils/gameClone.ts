import type { Game } from '@/types/domain.ts';
import { generateId } from '@/utils/id.ts';

/**
 * Creates a setup-mode clone of a game, preserving the team, roster, config,
 * attendance, goalie assignments, schedule, and manual overrides.
 * Resets all live-game state (timer, rotation index, player changes).
 */
export function cloneGame(source: Game, name: string): Game {
  return {
    ...source,
    id: generateId(),
    name,
    status: 'setup',
    // Keep: schedule, periodDivisions, absentPlayerIds, goalieAssignments, manualOverrides
    // Reset live-game state
    optimizationSuggestion: null,
    currentRotationIndex: 0,
    removedPlayerIds: [],
    addedPlayerIds: [],
    periodTimerStartedAt: null,
    periodTimerPausedElapsed: 0,
    createdAt: Date.now(),
    startedAt: null,
    completedAt: null,
  };
}
