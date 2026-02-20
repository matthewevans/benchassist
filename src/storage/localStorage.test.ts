import { describe, it, expect, beforeEach } from 'vitest';
import { loadData, saveData } from './localStorage.ts';

beforeEach(() => {
  localStorage.clear();
});

describe('loadData', () => {
  it('returns null when no data exists', () => {
    expect(loadData()).toBeNull();
  });

  it('returns null for invalid JSON', () => {
    localStorage.setItem('benchassist_data', 'not-json');
    expect(loadData()).toBeNull();
  });

  it('returns null when teams is missing', () => {
    localStorage.setItem('benchassist_data', JSON.stringify({ version: 1 }));
    expect(loadData()).toBeNull();
  });

  it('returns null when games is missing', () => {
    localStorage.setItem('benchassist_data', JSON.stringify({ version: 1, teams: {} }));
    expect(loadData()).toBeNull();
  });

  it('returns null when a team has invalid shape', () => {
    localStorage.setItem(
      'benchassist_data',
      JSON.stringify({
        version: 1,
        teams: { t1: { id: 123, name: 'Team' } }, // id should be string
        games: {},
      }),
    );
    expect(loadData()).toBeNull();
  });

  it('returns null when a team is missing rosters array', () => {
    localStorage.setItem(
      'benchassist_data',
      JSON.stringify({
        version: 1,
        teams: { t1: { id: 't1', name: 'Team' } }, // missing rosters
        games: {},
      }),
    );
    expect(loadData()).toBeNull();
  });

  it('returns null when a game has invalid shape', () => {
    localStorage.setItem(
      'benchassist_data',
      JSON.stringify({
        version: 1,
        teams: {},
        games: { g1: { id: 'g1' } }, // missing teamId, status
      }),
    );
    expect(loadData()).toBeNull();
  });

  it('loads valid data', () => {
    const data = {
      version: 1,
      teams: {
        t1: { id: 't1', name: 'Team 1', rosters: [], gameConfigs: [], createdAt: 0, updatedAt: 0 },
      },
      games: {
        g1: {
          id: 'g1',
          teamId: 't1',
          status: 'setup',
          name: 'Game 1',
          rosterId: 'r1',
          gameConfigId: 'c1',
          absentPlayerIds: [],
          goalieAssignments: [],
          manualOverrides: [],
          schedule: null,
          currentRotationIndex: 0,
          removedPlayerIds: [],
          addedPlayerIds: [],
          periodTimerStartedAt: null,
          periodTimerPausedElapsed: 0,
          createdAt: 0,
          startedAt: null,
          completedAt: null,
        },
      },
    };
    localStorage.setItem('benchassist_data', JSON.stringify(data));
    const result = loadData();
    expect(result).not.toBeNull();
    expect(result!.teams.t1.name).toBe('Team 1');
    expect(result!.games.g1.teamId).toBe('t1');
  });

  it('loads valid data with empty collections', () => {
    const data = { version: 4, teams: {}, games: {} };
    localStorage.setItem('benchassist_data', JSON.stringify(data));
    expect(loadData()).toEqual(data);
  });

  it('migrates v1 data by adding gender to teams', () => {
    const data = {
      version: 1,
      teams: {
        t1: { id: 't1', name: 'Team 1', rosters: [], gameConfigs: [], createdAt: 0, updatedAt: 0 },
      },
      games: {},
    };
    localStorage.setItem('benchassist_data', JSON.stringify(data));
    const result = loadData();
    expect(result!.version).toBe(4);
    expect(result!.teams.t1.gender).toBe('coed');
    expect(result!.teams.t1.birthYear).toBeNull();
  });
});

describe('localStorage migration v2→v3', () => {
  it('migrates v2 data to v3 by adding birthYear to teams', () => {
    const v2Data = {
      version: 2,
      teams: {
        t1: {
          id: 't1',
          name: 'Thunder 2017',
          gender: 'coed',
          rosters: [],
          gameConfigs: [
            {
              fieldSize: 7,
              id: 'c1',
              teamId: 't1',
              name: '7v7',
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
              balancePriority: 'balanced', // pre-v4 format, migration converts this
              createdAt: 1000,
              updatedAt: 1000,
            },
          ],
          createdAt: 1000,
          updatedAt: 1000,
        },
      },
      games: {},
    };
    localStorage.setItem('benchassist_data', JSON.stringify(v2Data));

    const result = loadData();
    expect(result).not.toBeNull();
    expect(result!.version).toBe(4);
    expect(result!.teams['t1'].birthYear).toBeNull();
    // v4 migration should convert balancePriority to skillBalance
    const config = result!.teams['t1'].gameConfigs[0];
    expect(config.skillBalance).toBe(true);
    expect((config as Record<string, unknown>).balancePriority).toBeUndefined();
  });

  it('sets birthYear to null for all teams (no auto-inference)', () => {
    const v2Data = {
      version: 2,
      teams: {
        t1: {
          id: 't1',
          name: 'Team A',
          gender: 'boys',
          rosters: [],
          gameConfigs: [],
          createdAt: 1000,
          updatedAt: 1000,
        },
      },
      games: {},
    };
    localStorage.setItem('benchassist_data', JSON.stringify(v2Data));

    const result = loadData();
    expect(result!.teams['t1'].birthYear).toBeNull();
  });

  it('preserves existing v3 data with birthYear and migrates to v4', () => {
    const v3Data = {
      version: 3,
      teams: {
        t1: {
          id: 't1',
          name: 'Team A',
          gender: 'coed',
          birthYear: 2017,
          rosters: [],
          gameConfigs: [],
          createdAt: 1000,
          updatedAt: 1000,
        },
      },
      games: {},
    };
    localStorage.setItem('benchassist_data', JSON.stringify(v3Data));

    const result = loadData();
    expect(result!.version).toBe(4);
    expect(result!.teams['t1'].birthYear).toBe(2017);
  });
});

describe('saveData', () => {
  it('persists data to localStorage', () => {
    const data = { version: 2, teams: {}, games: {} };
    saveData(data);
    expect(localStorage.getItem('benchassist_data')).toBe(JSON.stringify(data));
  });
});
