import { describe, it, expect } from 'vitest';
import { appReducer, type AppState } from './AppContext.tsx';
import { RotationAssignment } from '@/types/domain.ts';
import { gameFactory, playerFactory, buildRotation, buildSchedule } from '@/test/factories.ts';

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

  it('resets period timer when crossing period boundary', () => {
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
    expect(next.games[game.id].periodTimerStartedAt).toBeNull();
    expect(next.games[game.id].periodTimerPausedElapsed).toBe(0);
  });
});

describe('RETREAT_ROTATION', () => {
  it('does not retreat below zero', () => {
    const state = stateWithGame({ currentRotationIndex: 0 });
    const gameId = Object.keys(state.games)[0];
    const next = appReducer(state, { type: 'RETREAT_ROTATION', payload: gameId });
    expect(next.games[gameId].currentRotationIndex).toBe(0);
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
