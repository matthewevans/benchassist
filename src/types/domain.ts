export type TeamId = string;
export type RosterId = string;
export type GameConfigId = string;
export type GameId = string;
export type PlayerId = string;

export type SkillRanking = 1 | 2 | 3 | 4 | 5;

export type TeamGender = 'coed' | 'boys' | 'girls';

export const TEAM_GENDER_LABELS: Record<TeamGender, string> = {
  coed: 'Co-ed',
  boys: 'Boys',
  girls: 'Girls',
};

export const TEAM_GENDER_BORDER_COLORS: Record<TeamGender, string> = {
  coed: 'border-l-slate-400',
  boys: 'border-l-blue-400',
  girls: 'border-l-pink-400',
};

export const TEAM_GENDER_DOT_COLORS: Record<TeamGender, string> = {
  coed: 'bg-purple-400',
  boys: 'bg-blue-400',
  girls: 'bg-pink-400',
};

export enum PositionCode {
  GK = 'GK',
  DEF = 'DEF',
  MID = 'MID',
  FWD = 'FWD',
}

export type Position = `${PositionCode}`;
export type FieldPosition = Exclude<Position, `${PositionCode.GK}`>;

export const POSITION_VALUES: Position[] = Object.values(PositionCode);
export const FIELD_POSITION_VALUES: FieldPosition[] = POSITION_VALUES.filter(
  (position): position is FieldPosition => position !== PositionCode.GK,
);

export const POSITION_LABELS: Record<Position, string> = {
  [PositionCode.GK]: 'Goalkeeper',
  [PositionCode.DEF]: 'Defender',
  [PositionCode.MID]: 'Midfielder',
  [PositionCode.FWD]: 'Forward',
};

export type SubPosition =
  // Defenders
  | 'LB'
  | 'CB'
  | 'RB'
  | 'LCB'
  | 'RCB'
  // Midfielders
  | 'LM'
  | 'CM'
  | 'RM'
  | 'LCM'
  | 'RCM'
  // Forwards
  | 'LW'
  | 'RW'
  | 'ST'
  | 'CF';

export const SUB_POSITION_LABELS: Record<SubPosition, string> = {
  LB: 'Left Back',
  CB: 'Center Back',
  RB: 'Right Back',
  LCB: 'Left Center Back',
  RCB: 'Right Center Back',
  LM: 'Left Mid',
  CM: 'Center Mid',
  RM: 'Right Mid',
  LCM: 'Left Center Mid',
  RCM: 'Right Center Mid',
  LW: 'Left Wing',
  RW: 'Right Wing',
  ST: 'Striker',
  CF: 'Center Forward',
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
  useGoalie: boolean;

  // Togglable rules
  noConsecutiveBench: boolean;
  maxConsecutiveBench: number;
  enforceMinPlayTime: boolean;
  minPlayPercentage: number;
  goaliePlayFullPeriod: boolean;
  goalieRestAfterPeriod: boolean;
  skillBalance: boolean;

  createdAt: number;
  updatedAt: number;
}

export interface Team {
  id: TeamId;
  name: string;
  gender: TeamGender;
  birthYear: number | null;
  rosters: Roster[];
  gameConfigs: GameConfig[];
  createdAt: number;
  updatedAt: number;
}

export type GameStatus = 'setup' | 'in-progress' | 'completed';

export const GAME_STATUS_LABELS: Record<GameStatus, string> = {
  setup: 'Ready',
  'in-progress': 'Live',
  completed: 'Done',
};

export const GAME_STATUS_STYLES: Record<GameStatus, string> = {
  setup: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  'in-progress': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  completed: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

export enum RotationAssignment {
  Field = 'FIELD',
  Bench = 'BENCH',
  Goalie = 'GOALIE',
}

export type OverrideLockMode = 'hard' | 'soft';

export interface ManualOverride {
  playerId: PlayerId;
  rotationIndex: number;
  assignment: RotationAssignment;
  lockMode: OverrideLockMode;
  fieldPosition?: SubPosition;
}

export interface GoalieAssignment {
  periodIndex: number;
  playerId: PlayerId | 'auto';
}

export interface Rotation {
  index: number;
  periodIndex: number;
  assignments: Record<PlayerId, RotationAssignment>;
  fieldPositions?: Record<PlayerId, SubPosition>;
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
  periodDivisions: number[]; // per-period rotation counts (defaults from config)

  currentRotationIndex: number;
  removedPlayerIds: PlayerId[];
  addedPlayerIds: PlayerId[]; // late arrivals

  // Period timer (persisted for refresh survival)
  periodTimerStartedAt: number | null; // null = paused/stopped
  periodTimerPausedElapsed: number; // accumulated ms before current run

  createdAt: number;
  startedAt: number | null;
  completedAt: number | null;
}

// Preset game config templates
export interface GameConfigTemplate {
  name: string;
  group: 'standard' | 'gysa';
  gysaMinAge?: number; // inclusive U age lower bound (e.g. 5 for U5/U6)
  gysaMaxAge?: number; // inclusive U age upper bound (e.g. 6 for U5/U6)
  fieldSize: number;
  periods: number;
  periodDurationMinutes: number;
  rotationsPerPeriod: number;
  usePositions: boolean;
  formation: FormationSlot[];
  useGoalie: boolean;
}

export const DEFAULT_GAME_RULES = {
  noConsecutiveBench: true,
  maxConsecutiveBench: 1,
  enforceMinPlayTime: true,
  minPlayPercentage: 50,
  goaliePlayFullPeriod: true,
  goalieRestAfterPeriod: true,
  skillBalance: true,
} satisfies Pick<
  GameConfig,
  | 'noConsecutiveBench'
  | 'maxConsecutiveBench'
  | 'enforceMinPlayTime'
  | 'minPlayPercentage'
  | 'goaliePlayFullPeriod'
  | 'goalieRestAfterPeriod'
  | 'skillBalance'
>;

export const GAME_CONFIG_TEMPLATES: GameConfigTemplate[] = [
  // Standard formats
  {
    name: '5v5 (No Positions)',
    group: 'standard',
    fieldSize: 5,
    periods: 2,
    periodDurationMinutes: 25,
    rotationsPerPeriod: 2,
    usePositions: false,
    formation: [],
    useGoalie: true,
  },
  {
    name: '7v7',
    group: 'standard',
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
    useGoalie: true,
  },
  {
    name: '9v9',
    group: 'standard',
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
    useGoalie: true,
  },
  {
    name: '11v11',
    group: 'standard',
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
    useGoalie: true,
  },
  // GYSA brackets (azgysa.com)
  {
    name: 'GYSA U5/U6',
    group: 'gysa',
    gysaMinAge: 5,
    gysaMaxAge: 6,
    fieldSize: 4,
    periods: 4,
    periodDurationMinutes: 10,
    rotationsPerPeriod: 2,
    usePositions: false,
    formation: [],
    useGoalie: false,
  },
  {
    name: 'GYSA U7',
    group: 'gysa',
    gysaMinAge: 7,
    gysaMaxAge: 7,
    fieldSize: 5,
    periods: 4,
    periodDurationMinutes: 12,
    rotationsPerPeriod: 2,
    usePositions: false,
    formation: [],
    useGoalie: false,
  },
  {
    name: 'GYSA U8',
    group: 'gysa',
    gysaMinAge: 8,
    gysaMaxAge: 8,
    fieldSize: 6,
    periods: 4,
    periodDurationMinutes: 12,
    rotationsPerPeriod: 2,
    usePositions: true,
    formation: [
      { position: 'DEF', count: 2 },
      { position: 'MID', count: 2 },
      { position: 'FWD', count: 1 },
    ],
    useGoalie: true,
  },
  {
    name: 'GYSA U9',
    group: 'gysa',
    gysaMinAge: 9,
    gysaMaxAge: 9,
    fieldSize: 7,
    periods: 4,
    periodDurationMinutes: 12,
    rotationsPerPeriod: 2,
    usePositions: true,
    formation: [
      { position: 'DEF', count: 2 },
      { position: 'MID', count: 3 },
      { position: 'FWD', count: 1 },
    ],
    useGoalie: true,
  },
  {
    name: 'GYSA U10',
    group: 'gysa',
    gysaMinAge: 10,
    gysaMaxAge: 10,
    fieldSize: 7,
    periods: 4,
    periodDurationMinutes: 15,
    rotationsPerPeriod: 2,
    usePositions: true,
    formation: [
      { position: 'DEF', count: 2 },
      { position: 'MID', count: 3 },
      { position: 'FWD', count: 1 },
    ],
    useGoalie: true,
  },
  {
    name: 'GYSA U11/12/13',
    group: 'gysa',
    gysaMinAge: 11,
    gysaMaxAge: 13,
    fieldSize: 9,
    periods: 2,
    periodDurationMinutes: 30,
    rotationsPerPeriod: 2,
    usePositions: true,
    formation: [
      { position: 'DEF', count: 3 },
      { position: 'MID', count: 3 },
      { position: 'FWD', count: 2 },
    ],
    useGoalie: true,
  },
  {
    name: 'GYSA U14/15/16',
    group: 'gysa',
    gysaMinAge: 14,
    gysaMaxAge: 16,
    fieldSize: 11,
    periods: 2,
    periodDurationMinutes: 35,
    rotationsPerPeriod: 2,
    usePositions: true,
    formation: [
      { position: 'DEF', count: 4 },
      { position: 'MID', count: 3 },
      { position: 'FWD', count: 3 },
    ],
    useGoalie: true,
  },
];
