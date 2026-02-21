import { describe, it, expect } from 'vitest';
import { enablePatches, produceWithPatches, applyPatches } from 'immer';
import { appReducer, applyAction, type AppState } from './AppContext.tsx';
import { RotationAssignment, type Team } from '@/types/domain.ts';
import { gameFactory, playerFactory, buildRotation, buildSchedule } from '@/test/factories.ts';

enablePatches();

function stateWithGame(gameOverrides = {}): AppState {
  const p1 = playerFactory.build({ skillRanking: 3 });
  const p2 = playerFactory.build({ skillRanking: 2 });
  const rotations = [
    buildRotation(0, { [p1.id]: RotationAssignment.Field, [p2.id]: RotationAssignment.Bench }),
    buildRotation(1, { [p1.id]: RotationAssignment.Bench, [p2.id]: RotationAssignment.Field }),
    buildRotation(2, { [p1.id]: RotationAssignment.Field, [p2.id]: RotationAssignment.Bench }),
  ];
  const schedule = buildSchedule(rotations, [p1, p2]);
  const game = gameFactory.build({
    status: 'in-progress',
    schedule,
    currentRotationIndex: 0,
    ...gameOverrides,
  });
  return { teams: {}, games: { [game.id]: game }, favoriteDrillIds: [] };
}

describe('ADVANCE_ROTATION', () => {
  it('advances the rotation index', () => {
    const state = stateWithGame();
    const gameId = Object.keys(state.games)[0];
    const next = appReducer(state, { type: 'ADVANCE_ROTATION', payload: gameId });
    expect(next.games[gameId].currentRotationIndex).toBe(1);
  });

  it('does not advance past the last rotation', () => {
    const state = stateWithGame({ currentRotationIndex: 2 });
    const gameId = Object.keys(state.games)[0];
    const next = appReducer(state, { type: 'ADVANCE_ROTATION', payload: gameId });
    // Should remain at index 2 (last rotation) — no auto-completion
    expect(next.games[gameId].currentRotationIndex).toBe(2);
    expect(next.games[gameId].status).toBe('in-progress');
  });

  it('does not auto-mark game as completed at last rotation', () => {
    const state = stateWithGame({ currentRotationIndex: 2 });
    const gameId = Object.keys(state.games)[0];
    const next = appReducer(state, { type: 'ADVANCE_ROTATION', payload: gameId });
    // UI owns game completion, not the reducer
    expect(next.games[gameId].status).not.toBe('completed');
    expect(next.games[gameId].completedAt).toBeNull();
  });

  it('preserves period timer when crossing period boundary', () => {
    const p1 = playerFactory.build();
    const rotations = [
      { ...buildRotation(0, { [p1.id]: RotationAssignment.Field }), periodIndex: 0 },
      { ...buildRotation(1, { [p1.id]: RotationAssignment.Field }), periodIndex: 1 },
    ];
    const schedule = buildSchedule(rotations, [p1]);
    const game = gameFactory.build({
      status: 'in-progress',
      schedule,
      currentRotationIndex: 0,
      periodTimerStartedAt: Date.now(),
      periodTimerPausedElapsed: 5000,
    });
    const state: AppState = { teams: {}, games: { [game.id]: game }, favoriteDrillIds: [] };

    const next = appReducer(state, { type: 'ADVANCE_ROTATION', payload: game.id });
    expect(next.games[game.id].periodTimerStartedAt).toBe(game.periodTimerStartedAt);
    expect(next.games[game.id].periodTimerPausedElapsed).toBe(game.periodTimerPausedElapsed);
  });
});

describe('RETREAT_ROTATION', () => {
  it('does not retreat below zero', () => {
    const state = stateWithGame({ currentRotationIndex: 0 });
    const gameId = Object.keys(state.games)[0];
    const next = appReducer(state, { type: 'RETREAT_ROTATION', payload: gameId });
    expect(next.games[gameId].currentRotationIndex).toBe(0);
  });

  it('preserves period timer when moving back across a period boundary', () => {
    const p1 = playerFactory.build();
    const rotations = [
      { ...buildRotation(0, { [p1.id]: RotationAssignment.Field }), periodIndex: 0 },
      { ...buildRotation(1, { [p1.id]: RotationAssignment.Field }), periodIndex: 1 },
    ];
    const schedule = buildSchedule(rotations, [p1]);
    const game = gameFactory.build({
      status: 'in-progress',
      schedule,
      currentRotationIndex: 1,
      periodTimerStartedAt: Date.now(),
      periodTimerPausedElapsed: 5000,
    });
    const state: AppState = { teams: {}, games: { [game.id]: game }, favoriteDrillIds: [] };

    const next = appReducer(state, { type: 'RETREAT_ROTATION', payload: game.id });
    expect(next.games[game.id].periodTimerStartedAt).toBe(game.periodTimerStartedAt);
    expect(next.games[game.id].periodTimerPausedElapsed).toBe(game.periodTimerPausedElapsed);
  });
});

const emptyState: AppState = {
  teams: {},
  games: {},
  favoriteDrillIds: [],
};

describe('appReducer - TOGGLE_FAVORITE_DRILL', () => {
  it('adds a drill to favorites', () => {
    const result = appReducer(emptyState, {
      type: 'TOGGLE_FAVORITE_DRILL',
      payload: 'drill-1',
    });
    expect(result.favoriteDrillIds).toEqual(['drill-1']);
  });

  it('removes a drill from favorites when already present', () => {
    const state: AppState = { ...emptyState, favoriteDrillIds: ['drill-1', 'drill-2'] };
    const result = appReducer(state, {
      type: 'TOGGLE_FAVORITE_DRILL',
      payload: 'drill-1',
    });
    expect(result.favoriteDrillIds).toEqual(['drill-2']);
  });
});

describe('appReducer - SET_TEAM_BIRTH_YEAR', () => {
  it('sets birth year on a team', () => {
    const state: AppState = {
      ...emptyState,
      teams: {
        t1: {
          id: 't1',
          name: 'Test',
          gender: 'coed',
          birthYear: null,
          rosters: [],
          gameConfigs: [],
          createdAt: 1000,
          updatedAt: 1000,
        },
      },
    };
    const result = appReducer(state, {
      type: 'SET_TEAM_BIRTH_YEAR',
      payload: { teamId: 't1', birthYear: 2017 },
    });
    expect(result.teams['t1'].birthYear).toBe(2017);
  });

  it('clears birth year when set to null', () => {
    const state: AppState = {
      ...emptyState,
      teams: {
        t1: {
          id: 't1',
          name: 'Test',
          gender: 'coed',
          birthYear: 2017,
          rosters: [],
          gameConfigs: [],
          createdAt: 1000,
          updatedAt: 1000,
        },
      },
    };
    const result = appReducer(state, {
      type: 'SET_TEAM_BIRTH_YEAR',
      payload: { teamId: 't1', birthYear: null },
    });
    expect(result.teams['t1'].birthYear).toBeNull();
  });
});

// --- Undo via Immer patches ---

function makeTeam(overrides: Partial<Team> = {}): Team {
  return {
    id: 't1',
    name: 'Thunder FC',
    gender: 'coed',
    birthYear: 2017,
    rosters: [
      {
        id: 'r1',
        teamId: 't1',
        name: 'Spring 2026',
        players: [
          {
            id: 'p1',
            name: 'Alice',
            skillRanking: 3,
            canPlayGoalie: false,
            positions: [],
            createdAt: 1000,
            updatedAt: 1000,
          },
          {
            id: 'p2',
            name: 'Bob',
            skillRanking: 2,
            canPlayGoalie: true,
            positions: [],
            createdAt: 1000,
            updatedAt: 1000,
          },
        ],
        createdAt: 1000,
        updatedAt: 1000,
      },
    ],
    gameConfigs: [
      {
        id: 'gc1',
        teamId: 't1',
        name: '7v7',
        fieldSize: 7,
        periods: 2,
        periodDurationMinutes: 25,
        rotationsPerPeriod: 3,
        usePositions: false,
        formation: null,
        useGoalie: true,
        noConsecutiveBench: true,
        minPlayTime: 50,
        goalieRestAfter: true,
        prioritizeSkillBalance: false,
        createdAt: 1000,
        updatedAt: 1000,
      },
    ],
    createdAt: 1000,
    updatedAt: 1000,
    ...overrides,
  };
}

function undoAction(state: AppState, action: Parameters<typeof applyAction>[1]): AppState {
  const [, , inversePatches] = produceWithPatches(state, (draft) => applyAction(draft, action));
  const afterAction = appReducer(state, action);
  return applyPatches(afterAction, inversePatches) as AppState;
}

describe('Undo via Immer patches', () => {
  it('restores state after DELETE_TEAM', () => {
    const team = makeTeam();
    const game = gameFactory.build({ teamId: 't1' });
    const state: AppState = {
      teams: { t1: team },
      games: { [game.id]: game },
      favoriteDrillIds: [],
    };

    const restored = undoAction(state, { type: 'DELETE_TEAM', payload: 't1' });

    expect(restored.teams['t1']).toEqual(team);
    expect(restored.games[game.id]).toEqual(game);
  });

  it('restores state after DELETE_PLAYER', () => {
    const team = makeTeam();
    const state: AppState = { teams: { t1: team }, games: {}, favoriteDrillIds: [] };

    const restored = undoAction(state, {
      type: 'DELETE_PLAYER',
      payload: { teamId: 't1', rosterId: 'r1', playerId: 'p1' },
    });

    const players = restored.teams['t1'].rosters[0].players;
    expect(players).toHaveLength(2);
    expect(players.find((p) => p.id === 'p1')?.name).toBe('Alice');
  });

  it('restores state after DELETE_GAME', () => {
    const game = gameFactory.build();
    const state: AppState = {
      teams: {},
      games: { [game.id]: game },
      favoriteDrillIds: [],
    };

    const restored = undoAction(state, { type: 'DELETE_GAME', payload: game.id });

    expect(restored.games[game.id]).toEqual(game);
  });

  it('restores state after DELETE_GAME_CONFIG', () => {
    const team = makeTeam();
    const state: AppState = { teams: { t1: team }, games: {}, favoriteDrillIds: [] };

    const restored = undoAction(state, {
      type: 'DELETE_GAME_CONFIG',
      payload: { teamId: 't1', configId: 'gc1' },
    });

    expect(restored.teams['t1'].gameConfigs).toHaveLength(1);
    expect(restored.teams['t1'].gameConfigs[0].id).toBe('gc1');
  });

  it('restores state after IMPORT_DATA', () => {
    const team = makeTeam();
    const state: AppState = {
      teams: { t1: team },
      games: {},
      favoriteDrillIds: ['drill-1'],
    };

    const importPayload: AppState = {
      teams: {},
      games: {},
      favoriteDrillIds: ['drill-99'],
    };

    const restored = undoAction(state, { type: 'IMPORT_DATA', payload: importPayload });

    expect(restored.teams['t1']).toEqual(team);
    expect(restored.favoriteDrillIds).toEqual(['drill-1']);
  });

  it('restores state after DELETE_ROSTER', () => {
    const team = makeTeam();
    const state: AppState = { teams: { t1: team }, games: {}, favoriteDrillIds: [] };

    const restored = undoAction(state, {
      type: 'DELETE_ROSTER',
      payload: { teamId: 't1', rosterId: 'r1' },
    });

    expect(restored.teams['t1'].rosters).toHaveLength(1);
    expect(restored.teams['t1'].rosters[0].id).toBe('r1');
    expect(restored.teams['t1'].rosters[0].players).toHaveLength(2);
  });

  it('restores state after MERGE_DATA', () => {
    const team = makeTeam();
    const state: AppState = {
      teams: { t1: team },
      games: {},
      favoriteDrillIds: ['drill-1'],
    };

    const mergePayload: AppState = {
      teams: { t2: { ...makeTeam(), id: 't2', name: 'Newcomers' } },
      games: {},
      favoriteDrillIds: ['drill-2'],
    };

    const restored = undoAction(state, { type: 'MERGE_DATA', payload: mergePayload });

    expect(restored.teams['t1']).toEqual(team);
    expect(restored.teams['t2']).toBeUndefined();
    expect(restored.favoriteDrillIds).toEqual(['drill-1']);
  });
});

describe('appReducer - MERGE_DATA', () => {
  it('adds imported teams without removing existing ones', () => {
    const existing = makeTeam();
    const imported = { ...makeTeam(), id: 't2', name: 'Thunder B' };
    const state: AppState = { teams: { t1: existing }, games: {}, favoriteDrillIds: [] };

    const result = appReducer(state, {
      type: 'MERGE_DATA',
      payload: { teams: { t2: imported }, games: {}, favoriteDrillIds: [] },
    });

    expect(result.teams['t1']).toEqual(existing);
    expect(result.teams['t2']).toEqual(imported);
  });

  it('overwrites an existing team when IDs collide', () => {
    const existing = makeTeam();
    const updated = { ...makeTeam(), name: 'Updated Name' };
    const state: AppState = { teams: { t1: existing }, games: {}, favoriteDrillIds: [] };

    const result = appReducer(state, {
      type: 'MERGE_DATA',
      payload: { teams: { t1: updated }, games: {}, favoriteDrillIds: [] },
    });

    expect(result.teams['t1'].name).toBe('Updated Name');
  });

  it('unions favorite drill IDs without duplicates', () => {
    const state: AppState = { teams: {}, games: {}, favoriteDrillIds: ['a', 'b'] };

    const result = appReducer(state, {
      type: 'MERGE_DATA',
      payload: { teams: {}, games: {}, favoriteDrillIds: ['b', 'c'] },
    });

    expect(result.favoriteDrillIds).toEqual(['a', 'b', 'c']);
  });
});
