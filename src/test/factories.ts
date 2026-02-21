import { Factory } from 'fishery';
import { generateId } from '@/utils/id.ts';
import { RotationAssignment } from '@/types/domain.ts';
import type {
  Player,
  GameConfig,
  Team,
  Roster,
  Game,
  Rotation,
  RotationSchedule,
  SkillRanking,
} from '@/types/domain.ts';
import { calculatePlayerStats, computeStrengthStats } from '@/utils/stats.ts';

export const playerFactory = Factory.define<Player>(({ sequence }) => ({
  id: generateId(),
  name: `Player ${sequence}`,
  skillRanking: (((sequence - 1) % 5) + 1) as SkillRanking,
  canPlayGoalie: sequence <= 2,
  primaryPosition: null,
  secondaryPositions: [],
  createdAt: Date.now(),
}));

export const gameConfigFactory = Factory.define<GameConfig>(() => ({
  id: generateId(),
  teamId: generateId(),
  name: 'Default 7v7',
  fieldSize: 7,
  periods: 2,
  periodDurationMinutes: 30,
  rotationsPerPeriod: 2,
  usePositions: false,
  formation: [],
  useGoalie: true,
  noConsecutiveBench: true,
  maxConsecutiveBench: 1,
  enforceMinPlayTime: true,
  minPlayPercentage: 50,
  goaliePlayFullPeriod: true,
  goalieRestAfterPeriod: true,
  skillBalance: true,
  createdAt: Date.now(),
  updatedAt: Date.now(),
}));

export const rosterFactory = Factory.define<Roster>(({ sequence }) => ({
  id: generateId(),
  teamId: generateId(),
  name: `Roster ${sequence}`,
  players: [],
  createdAt: Date.now(),
  updatedAt: Date.now(),
}));

export const teamFactory = Factory.define<Team>(({ sequence }) => ({
  id: generateId(),
  name: `Team ${sequence}`,
  gender: 'coed',
  birthYear: null,
  rosters: [],
  gameConfigs: [],
  createdAt: Date.now(),
  updatedAt: Date.now(),
}));

export const gameFactory = Factory.define<Game>(() => ({
  id: generateId(),
  teamId: generateId(),
  rosterId: generateId(),
  gameConfigId: generateId(),
  name: 'Test Game',
  status: 'setup',
  absentPlayerIds: [],
  goalieAssignments: [],
  manualOverrides: [],
  schedule: null,
  periodDivisions: [2, 2],
  currentRotationIndex: 0,
  removedPlayerIds: [],
  addedPlayerIds: [],
  periodTimerStartedAt: null,
  periodTimerPausedElapsed: 0,
  createdAt: Date.now(),
  startedAt: null,
  completedAt: null,
}));

export const rotationFactory = Factory.define<Rotation>(({ sequence }) => ({
  index: sequence - 1,
  periodIndex: 0,
  assignments: {},
  teamStrength: 0,
  violations: [],
}));

export function resetFactories(): void {
  playerFactory.rewindSequence();
  rosterFactory.rewindSequence();
  teamFactory.rewindSequence();
  gameFactory.rewindSequence();
  rotationFactory.rewindSequence();
}

export function buildRotation(
  index: number,
  assignments: Record<string, RotationAssignment>,
): Rotation {
  return rotationFactory.build({ index, assignments });
}

export function buildRoster(playerCount: number, options?: { goalieCount?: number }): Player[] {
  const goalieCount = options?.goalieCount ?? 2;
  return playerFactory.buildList(playerCount).map((p, i) => ({
    ...p,
    canPlayGoalie: i < goalieCount,
  }));
}

export function buildSchedule(rotations: Rotation[], players: Player[]): RotationSchedule {
  const playerStats = calculatePlayerStats(rotations, players);
  const strengths = rotations.map((r) => r.teamStrength);
  const { avg, variance, min, max } = computeStrengthStats(strengths);

  return {
    rotations,
    playerStats,
    overallStats: {
      strengthVariance: variance,
      minStrength: min,
      maxStrength: max,
      avgStrength: Math.round(avg * 10) / 10,
      violations: [],
      isValid: true,
    },
    generatedAt: Date.now(),
  };
}
