import { useReducer, useCallback, useRef, useState, useLayoutEffect } from 'react';
import { produceWithPatches, applyPatches, type Patch } from 'immer';
import type { AppState, AppAction } from '@/context/AppContext.tsx';
import { applyAction, appReducer } from '@/context/AppContext.tsx';

interface UndoEntry {
  description: string;
  inversePatches: Patch[];
  timestamp: number;
}

const MAX_UNDO = 30;

export const UNDOABLE_ACTIONS = new Set<AppAction['type']>([
  'DELETE_TEAM',
  'DELETE_ROSTER',
  'DELETE_PLAYER',
  'DELETE_GAME',
  'DELETE_GAME_CONFIG',
  'IMPORT_DATA',
  'MERGE_DATA',
]);

export function getUndoDescription(action: AppAction, state: AppState): string {
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

export function useUndoReducer(initialState: AppState) {
  const [state, rawDispatch] = useReducer(appReducer, initialState);

  const stateRef = useRef(state);
  useLayoutEffect(() => {
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

  return { state, dispatch, undo, canUndo };
}
