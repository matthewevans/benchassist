export type TeamId = string;
export type RosterId = string;
export type GameConfigId = string;
export type GameId = string;
export type PlayerId = string;

export type SkillRanking = 1 | 2 | 3 | 4 | 5;

export type Position = 'GK' | 'DEF' | 'MID' | 'FWD';

export const POSITION_LABELS: Record<Position, string> = {
  GK: 'Goalkeeper',
  DEF: 'Defender',
  MID: 'Midfielder',
  FWD: 'Forward',
};

export interface Player {
  id: PlayerId;
  name: string;
  skillRanking: SkillRanking;
  canPlayGoalie: boolean;
  primaryPosition: Position | null; // null if format has no positions
  secondaryPositions: Position[];
  createdAt: number;
}

export interface Roster {
  id: RosterId;
  teamId: TeamId;
  name: string;
  players: Player[];
  createdAt: number;
  updatedAt: number;
}

export interface FormationSlot {
  position: Position;
  count: number;
}

export interface GameConfig {
  id: GameConfigId;
  teamId: TeamId;
  name: string;
  fieldSize: number;
  periods: number;
  periodDurationMinutes: number;
  rotationsPerPeriod: number;
  usePositions: boolean;
  formation: FormationSlot[]; // only used if usePositions is true

  // Togglable rules
  noConsecutiveBench: boolean;
  maxConsecutiveBench: number;
  enforceMinPlayTime: boolean;
  minPlayPercentage: number;
  goaliePlayFullPeriod: boolean;
  goalieRestAfterPeriod: boolean;
  balancePriority: 'strict' | 'balanced' | 'off';

  createdAt: number;
  updatedAt: number;
}

export interface Team {
  id: TeamId;
  name: string;
  rosters: Roster[];
  gameConfigs: GameConfig[];
  createdAt: number;
  updatedAt: number;
}

export type GameStatus = 'setup' | 'in-progress' | 'completed';

export enum RotationAssignment {
  Field = 'FIELD',
  Bench = 'BENCH',
  Goalie = 'GOALIE',
}


export interface ManualOverride {
  playerId: PlayerId;
  rotationIndex: number;
  assignment: RotationAssignment;
}

export interface GoalieAssignment {
  periodIndex: number;
  playerId: PlayerId | 'auto';
}

export interface Rotation {
  index: number;
  periodIndex: number;
  assignments: Record<PlayerId, RotationAssignment>;
  teamStrength: number;
  violations: string[];
}

export interface PlayerStats {
  playerId: PlayerId;
  playerName: string;
  rotationsPlayed: number;
  rotationsBenched: number;
  rotationsGoalie: number;
  totalRotations: number;
  playPercentage: number;
  maxConsecutiveBench: number;
}

export interface RotationSchedule {
  rotations: Rotation[];
  playerStats: Record<PlayerId, PlayerStats>;
  overallStats: {
    strengthVariance: number;
    minStrength: number;
    maxStrength: number;
    avgStrength: number;
    violations: string[];
    isValid: boolean;
  };
  generatedAt: number;
}

export interface Game {
  id: GameId;
  teamId: TeamId;
  rosterId: RosterId;
  gameConfigId: GameConfigId;
  name: string;
  status: GameStatus;

  absentPlayerIds: PlayerId[];
  goalieAssignments: GoalieAssignment[];
  manualOverrides: ManualOverride[];

  schedule: RotationSchedule | null;

  currentRotationIndex: number;
  removedPlayerIds: PlayerId[];
  addedPlayerIds: PlayerId[]; // late arrivals

  createdAt: number;
  startedAt: number | null;
  completedAt: number | null;
}

// Preset game config templates
export interface GameConfigTemplate {
  name: string;
  fieldSize: number;
  periods: number;
  periodDurationMinutes: number;
  rotationsPerPeriod: number;
  usePositions: boolean;
  formation: FormationSlot[];
}

export const GAME_CONFIG_TEMPLATES: GameConfigTemplate[] = [
  {
    name: '5v5 (No Positions)',
    fieldSize: 5,
    periods: 2,
    periodDurationMinutes: 25,
    rotationsPerPeriod: 2,
    usePositions: false,
    formation: [],
  },
  {
    name: '7v7',
    fieldSize: 7,
    periods: 2,
    periodDurationMinutes: 30,
    rotationsPerPeriod: 2,
    usePositions: true,
    formation: [
      { position: 'DEF', count: 2 },
      { position: 'MID', count: 3 },
      { position: 'FWD', count: 1 },
    ],
  },
  {
    name: '9v9',
    fieldSize: 9,
    periods: 2,
    periodDurationMinutes: 35,
    rotationsPerPeriod: 2,
    usePositions: true,
    formation: [
      { position: 'DEF', count: 3 },
      { position: 'MID', count: 3 },
      { position: 'FWD', count: 2 },
    ],
  },
  {
    name: '11v11',
    fieldSize: 11,
    periods: 2,
    periodDurationMinutes: 45,
    rotationsPerPeriod: 2,
    usePositions: true,
    formation: [
      { position: 'DEF', count: 4 },
      { position: 'MID', count: 4 },
      { position: 'FWD', count: 2 },
    ],
  },
];
