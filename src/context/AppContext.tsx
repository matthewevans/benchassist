import {
  createContext,
  useReducer,
  useEffect,
  useRef,
  useCallback,
  useState,
  type ReactNode,
} from 'react';
import type {
  Team,
  TeamGender,
  Game,
  Roster,
  Player,
  GameConfig,
  RotationSchedule,
  TeamId,
  RosterId,
  PlayerId,
  GameConfigId,
  GameId,
} from '@/types/domain.ts';
import { produce, enablePatches, produceWithPatches, applyPatches, type Patch } from 'immer';
import { loadData, saveData, CURRENT_VERSION, type StorageData } from '@/storage/localStorage.ts';

enablePatches();

// --- State ---

export interface AppState {
  teams: Record<TeamId, Team>;
  games: Record<GameId, Game>;
  favoriteDrillIds: string[];
}

const INITIAL_STATE: AppState = {
  teams: {},
  games: {},
  favoriteDrillIds: [],
};

// --- Actions ---

export type AppAction =
  | { type: 'LOAD_DATA'; payload: AppState }
  | { type: 'IMPORT_DATA'; payload: AppState }
  | { type: 'MERGE_DATA'; payload: AppState }
  // Team
  | { type: 'CREATE_TEAM'; payload: Team }
  | { type: 'UPDATE_TEAM'; payload: { teamId: TeamId; name: string; gender: TeamGender } }
  | { type: 'DELETE_TEAM'; payload: TeamId }
  // Roster
  | { type: 'ADD_ROSTER'; payload: { teamId: TeamId; roster: Roster } }
  | { type: 'UPDATE_ROSTER'; payload: { teamId: TeamId; roster: Roster } }
  | { type: 'DELETE_ROSTER'; payload: { teamId: TeamId; rosterId: RosterId } }
  // Player
  | { type: 'ADD_PLAYER'; payload: { teamId: TeamId; rosterId: RosterId; player: Player } }
  | { type: 'UPDATE_PLAYER'; payload: { teamId: TeamId; rosterId: RosterId; player: Player } }
  | { type: 'DELETE_PLAYER'; payload: { teamId: TeamId; rosterId: RosterId; playerId: PlayerId } }
  // Game Config
  | { type: 'ADD_GAME_CONFIG'; payload: { teamId: TeamId; config: GameConfig } }
  | { type: 'UPDATE_GAME_CONFIG'; payload: { teamId: TeamId; config: GameConfig } }
  | { type: 'DELETE_GAME_CONFIG'; payload: { teamId: TeamId; configId: GameConfigId } }
  // Game
  | { type: 'CREATE_GAME'; payload: Game }
  | { type: 'UPDATE_GAME'; payload: Game }
  | { type: 'DELETE_GAME'; payload: GameId }
  | { type: 'SET_GAME_SCHEDULE'; payload: { gameId: GameId; schedule: RotationSchedule } }
  | { type: 'ADVANCE_ROTATION'; payload: GameId }
  | { type: 'RETREAT_ROTATION'; payload: GameId }
  | { type: 'REMOVE_PLAYER_FROM_GAME'; payload: { gameId: GameId; playerId: PlayerId } }
  | { type: 'ADD_PLAYER_TO_GAME'; payload: { gameId: GameId; playerId: PlayerId } }
  | { type: 'START_PERIOD_TIMER'; payload: { gameId: GameId; startedAt: number } }
  | { type: 'PAUSE_PERIOD_TIMER'; payload: { gameId: GameId; pausedElapsed: number } }
  | { type: 'RESET_PERIOD_TIMER'; payload: { gameId: GameId } }
  // Favorites
  | { type: 'TOGGLE_FAVORITE_DRILL'; payload: string }
  // Team birth year
  | { type: 'SET_TEAM_BIRTH_YEAR'; payload: { teamId: TeamId; birthYear: number | null } };

// --- Mutation logic (shared by reducer and undo system) ---

// eslint-disable-next-line react-refresh/only-export-components
export function applyAction(draft: AppState, action: AppAction): void {
  switch (action.type) {
    case 'LOAD_DATA':
    case 'IMPORT_DATA':
      draft.teams = action.payload.teams;
      draft.games = action.payload.games;
      draft.favoriteDrillIds = action.payload.favoriteDrillIds ?? [];
      break;

    case 'MERGE_DATA':
      for (const [id, team] of Object.entries(action.payload.teams)) {
        draft.teams[id] = team;
      }
      for (const [id, game] of Object.entries(action.payload.games)) {
        draft.games[id] = game;
      }
      for (const drillId of action.payload.favoriteDrillIds ?? []) {
        if (!draft.favoriteDrillIds.includes(drillId)) {
          draft.favoriteDrillIds.push(drillId);
        }
      }
      break;

    case 'CREATE_TEAM':
      draft.teams[action.payload.id] = action.payload;
      break;

    case 'UPDATE_TEAM':
      if (draft.teams[action.payload.teamId]) {
        draft.teams[action.payload.teamId].name = action.payload.name;
        draft.teams[action.payload.teamId].gender = action.payload.gender;
        draft.teams[action.payload.teamId].updatedAt = Date.now();
      }
      break;

    case 'DELETE_TEAM': {
      delete draft.teams[action.payload];
      for (const gameId of Object.keys(draft.games)) {
        if (draft.games[gameId].teamId === action.payload) {
          delete draft.games[gameId];
        }
      }
      break;
    }

    case 'ADD_ROSTER': {
      const team = draft.teams[action.payload.teamId];
      if (team) {
        team.rosters.push(action.payload.roster);
        team.updatedAt = Date.now();
      }
      break;
    }

    case 'UPDATE_ROSTER': {
      const team = draft.teams[action.payload.teamId];
      if (team) {
        const idx = team.rosters.findIndex((r) => r.id === action.payload.roster.id);
        if (idx !== -1) {
          team.rosters[idx] = action.payload.roster;
          team.updatedAt = Date.now();
        }
      }
      break;
    }

    case 'DELETE_ROSTER': {
      const team = draft.teams[action.payload.teamId];
      if (team) {
        team.rosters = team.rosters.filter((r) => r.id !== action.payload.rosterId);
        team.updatedAt = Date.now();
      }
      break;
    }

    case 'ADD_PLAYER': {
      const team = draft.teams[action.payload.teamId];
      const roster = team?.rosters.find((r) => r.id === action.payload.rosterId);
      if (roster) {
        roster.players.push(action.payload.player);
        roster.updatedAt = Date.now();
      }
      break;
    }

    case 'UPDATE_PLAYER': {
      const team = draft.teams[action.payload.teamId];
      const roster = team?.rosters.find((r) => r.id === action.payload.rosterId);
      if (roster) {
        const idx = roster.players.findIndex((p) => p.id === action.payload.player.id);
        if (idx !== -1) {
          roster.players[idx] = action.payload.player;
          roster.updatedAt = Date.now();
        }
      }
      break;
    }

    case 'DELETE_PLAYER': {
      const team = draft.teams[action.payload.teamId];
      const roster = team?.rosters.find((r) => r.id === action.payload.rosterId);
      if (roster) {
        roster.players = roster.players.filter((p) => p.id !== action.payload.playerId);
        roster.updatedAt = Date.now();
      }
      break;
    }

    case 'ADD_GAME_CONFIG': {
      const team = draft.teams[action.payload.teamId];
      if (team) {
        team.gameConfigs.push(action.payload.config);
        team.updatedAt = Date.now();
      }
      break;
    }

    case 'UPDATE_GAME_CONFIG': {
      const team = draft.teams[action.payload.teamId];
      if (team) {
        const idx = team.gameConfigs.findIndex((c) => c.id === action.payload.config.id);
        if (idx !== -1) {
          team.gameConfigs[idx] = action.payload.config;
          team.updatedAt = Date.now();
        }
      }
      break;
    }

    case 'DELETE_GAME_CONFIG': {
      const team = draft.teams[action.payload.teamId];
      if (team) {
        team.gameConfigs = team.gameConfigs.filter((c) => c.id !== action.payload.configId);
        team.updatedAt = Date.now();
      }
      break;
    }

    case 'CREATE_GAME':
      draft.games[action.payload.id] = action.payload;
      break;

    case 'UPDATE_GAME':
      draft.games[action.payload.id] = action.payload;
      break;

    case 'DELETE_GAME':
      delete draft.games[action.payload];
      break;

    case 'SET_GAME_SCHEDULE':
      if (draft.games[action.payload.gameId]) {
        draft.games[action.payload.gameId].schedule = action.payload.schedule;
      }
      break;

    case 'ADVANCE_ROTATION':
      if (draft.games[action.payload]) {
        const game = draft.games[action.payload];
        if (!game.schedule || game.currentRotationIndex >= game.schedule.rotations.length - 1) {
          break; // At or past last rotation — UI handles game completion
        }
        const prevPeriod = game.schedule.rotations[game.currentRotationIndex].periodIndex;
        game.currentRotationIndex += 1;
        const nextPeriod = game.schedule.rotations[game.currentRotationIndex].periodIndex;
        if (prevPeriod !== nextPeriod) {
          game.periodTimerStartedAt = null;
          game.periodTimerPausedElapsed = 0;
        }
      }
      break;

    case 'RETREAT_ROTATION':
      if (draft.games[action.payload]) {
        const game = draft.games[action.payload];
        if (game.currentRotationIndex <= 0) break;
        const prevPeriod = game.schedule?.rotations[game.currentRotationIndex]?.periodIndex;
        game.currentRotationIndex -= 1;
        const newPeriod = game.schedule?.rotations[game.currentRotationIndex]?.periodIndex;
        if (prevPeriod !== newPeriod) {
          game.periodTimerStartedAt = null;
          game.periodTimerPausedElapsed = 0;
        }
      }
      break;

    case 'REMOVE_PLAYER_FROM_GAME':
      if (draft.games[action.payload.gameId]) {
        draft.games[action.payload.gameId].removedPlayerIds.push(action.payload.playerId);
      }
      break;

    case 'ADD_PLAYER_TO_GAME':
      if (draft.games[action.payload.gameId]) {
        const game = draft.games[action.payload.gameId];
        game.addedPlayerIds.push(action.payload.playerId);
        game.removedPlayerIds = game.removedPlayerIds.filter(
          (id) => id !== action.payload.playerId,
        );
        game.absentPlayerIds = game.absentPlayerIds.filter((id) => id !== action.payload.playerId);
      }
      break;

    case 'START_PERIOD_TIMER':
      if (draft.games[action.payload.gameId]) {
        draft.games[action.payload.gameId].periodTimerStartedAt = action.payload.startedAt;
      }
      break;

    case 'PAUSE_PERIOD_TIMER':
      if (draft.games[action.payload.gameId]) {
        const game = draft.games[action.payload.gameId];
        game.periodTimerStartedAt = null;
        game.periodTimerPausedElapsed = action.payload.pausedElapsed;
      }
      break;

    case 'RESET_PERIOD_TIMER':
      if (draft.games[action.payload.gameId]) {
        const game = draft.games[action.payload.gameId];
        game.periodTimerStartedAt = null;
        game.periodTimerPausedElapsed = 0;
      }
      break;

    case 'TOGGLE_FAVORITE_DRILL': {
      const idx = draft.favoriteDrillIds.indexOf(action.payload);
      if (idx >= 0) {
        draft.favoriteDrillIds.splice(idx, 1);
      } else {
        draft.favoriteDrillIds.push(action.payload);
      }
      break;
    }

    case 'SET_TEAM_BIRTH_YEAR':
      if (draft.teams[action.payload.teamId]) {
        draft.teams[action.payload.teamId].birthYear = action.payload.birthYear;
        draft.teams[action.payload.teamId].updatedAt = Date.now();
      }
      break;

    default: {
      const _exhaustive: never = action;
      void _exhaustive;
    }
  }
}

// --- Reducer ---

// eslint-disable-next-line react-refresh/only-export-components
export function appReducer(state: AppState, action: AppAction): AppState {
  return produce(state, (draft) => applyAction(draft, action));
}

// --- Undo system ---

interface UndoEntry {
  description: string;
  inversePatches: Patch[];
  timestamp: number;
}

const MAX_UNDO = 30;

const UNDOABLE_ACTIONS = new Set<AppAction['type']>([
  'DELETE_TEAM',
  'DELETE_ROSTER',
  'DELETE_PLAYER',
  'DELETE_GAME',
  'DELETE_GAME_CONFIG',
  'IMPORT_DATA',
  'MERGE_DATA',
]);

function getUndoDescription(action: AppAction, state: AppState): string {
  switch (action.type) {
    case 'DELETE_TEAM': {
      const team = state.teams[action.payload];
      return `Deleted ${team?.name ?? 'team'}`;
    }
    case 'DELETE_ROSTER': {
      const team = state.teams[action.payload.teamId];
      const roster = team?.rosters.find((r) => r.id === action.payload.rosterId);
      return `Deleted roster ${roster?.name ?? ''}`.trim();
    }
    case 'DELETE_PLAYER': {
      const team = state.teams[action.payload.teamId];
      const roster = team?.rosters.find((r) => r.id === action.payload.rosterId);
      const player = roster?.players.find((p) => p.id === action.payload.playerId);
      return `Removed ${player?.name ?? 'player'}`;
    }
    case 'DELETE_GAME': {
      const game = state.games[action.payload];
      return `Deleted ${game?.name ?? 'game'}`;
    }
    case 'DELETE_GAME_CONFIG': {
      const team = state.teams[action.payload.teamId];
      const config = team?.gameConfigs.find((c) => c.id === action.payload.configId);
      return `Deleted config ${config?.name ?? ''}`.trim();
    }
    case 'IMPORT_DATA':
      return 'Imported data (replaced all)';
    case 'MERGE_DATA':
      return 'Merged imported data';
    default:
      return 'Action';
  }
}

// --- Context ---

export interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  undo: () => string | null;
  canUndo: boolean;
}

// eslint-disable-next-line react-refresh/only-export-components
export const AppContext = createContext<AppContextValue | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, rawDispatch] = useReducer(appReducer, INITIAL_STATE, () => {
    const saved = loadData();
    if (saved) {
      return {
        teams: saved.teams,
        games: saved.games,
        favoriteDrillIds: saved.favoriteDrillIds ?? [],
      };
    }
    return INITIAL_STATE;
  });

  // Keep a ref to current state for undo computations
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  });

  const undoStackRef = useRef<UndoEntry[]>([]);
  const [canUndo, setCanUndo] = useState(false);

  const dispatch = useCallback((action: AppAction) => {
    if (UNDOABLE_ACTIONS.has(action.type)) {
      const currentState = stateRef.current;
      const description = getUndoDescription(action, currentState);

      const [nextState, , inversePatches] = produceWithPatches(currentState, (draft) =>
        applyAction(draft, action),
      );

      undoStackRef.current.push({ description, inversePatches, timestamp: Date.now() });
      if (undoStackRef.current.length > MAX_UNDO) {
        undoStackRef.current.splice(0, undoStackRef.current.length - MAX_UNDO);
      }
      setCanUndo(true);

      // Dispatch LOAD_DATA with the pre-computed next state
      rawDispatch({ type: 'LOAD_DATA', payload: nextState });
    } else {
      rawDispatch(action);
    }
  }, []);

  const undo = useCallback((): string | null => {
    const entry = undoStackRef.current.pop();
    if (!entry) return null;

    const restored = applyPatches(stateRef.current, entry.inversePatches);
    rawDispatch({ type: 'LOAD_DATA', payload: restored as AppState });
    setCanUndo(undoStackRef.current.length > 0);
    return entry.description;
  }, []);

  // Persistence
  const saveTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => {
    clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      const data: StorageData = {
        version: CURRENT_VERSION,
        teams: state.teams,
        games: state.games,
        favoriteDrillIds: state.favoriteDrillIds,
      };
      saveData(data);
    }, 500);
    return () => clearTimeout(saveTimeout.current);
  }, [state]);

  return (
    <AppContext.Provider value={{ state, dispatch, undo, canUndo }}>{children}</AppContext.Provider>
  );
}
