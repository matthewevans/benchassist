import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  loadData,
  saveData,
  migrateV1toV2,
  migrateV2toV3,
  migrateV3toV4,
  migrateV4toV5,
  migrateV5toV6,
  CURRENT_VERSION,
} from './localStorage.ts';

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
    const data = { version: CURRENT_VERSION, teams: {}, games: {} };
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
    expect(result!.version).toBe(CURRENT_VERSION);
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
    expect(result!.version).toBe(CURRENT_VERSION);
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

  it('preserves existing v3 data with birthYear and migrates to latest', () => {
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
    expect(result!.version).toBe(CURRENT_VERSION);
    expect(result!.teams['t1'].birthYear).toBe(2017);
  });
});

describe('CURRENT_VERSION', () => {
  it('equals migration steps count + 1', () => {
    expect(CURRENT_VERSION).toBe(6);
  });
});

describe('migrateV1toV2', () => {
  it('adds gender: coed to teams without gender', () => {
    const result = migrateV1toV2({
      version: 1,
      teams: { t1: { id: 't1', name: 'A' } },
      games: {},
    });
    expect(result.version).toBe(2);
    expect(result.teams.t1.gender).toBe('coed');
  });

  it('preserves existing gender value', () => {
    const result = migrateV1toV2({
      version: 1,
      teams: { t1: { id: 't1', name: 'A', gender: 'boys' } },
      games: {},
    });
    expect(result.teams.t1.gender).toBe('boys');
  });

  it('passes through games unchanged', () => {
    const games = { g1: { id: 'g1', status: 'setup' } };
    const result = migrateV1toV2({ version: 1, teams: {}, games });
    expect(result.games).toEqual(games);
  });
});

describe('migrateV2toV3', () => {
  it('adds birthYear: null to teams', () => {
    const result = migrateV2toV3({
      version: 2,
      teams: { t1: { id: 't1', gender: 'coed' } },
      games: {},
    });
    expect(result.version).toBe(3);
    expect(result.teams.t1.birthYear).toBeNull();
  });

  it('preserves existing birthYear', () => {
    const result = migrateV2toV3({
      version: 2,
      teams: { t1: { id: 't1', gender: 'coed', birthYear: 2017 } },
      games: {},
    });
    expect(result.teams.t1.birthYear).toBe(2017);
  });

  it('defaults gender to coed if still missing', () => {
    const result = migrateV2toV3({
      version: 2,
      teams: { t1: { id: 't1' } },
      games: {},
    });
    expect(result.teams.t1.gender).toBe('coed');
  });
});

describe('migrateV3toV4', () => {
  it('converts balancePriority "balanced" to skillBalance true', () => {
    const result = migrateV3toV4({
      version: 3,
      teams: {
        t1: {
          id: 't1',
          gameConfigs: [{ id: 'c1', balancePriority: 'balanced' }],
        },
      },
      games: {},
    });
    expect(result.version).toBe(4);
    expect(result.teams.t1.gameConfigs[0].skillBalance).toBe(true);
    expect(result.teams.t1.gameConfigs[0].balancePriority).toBeUndefined();
  });

  it('converts balancePriority "strict" to skillBalance true', () => {
    const result = migrateV3toV4({
      version: 3,
      teams: {
        t1: { id: 't1', gameConfigs: [{ id: 'c1', balancePriority: 'strict' }] },
      },
      games: {},
    });
    expect(result.teams.t1.gameConfigs[0].skillBalance).toBe(true);
  });

  it('converts balancePriority "off" to skillBalance false', () => {
    const result = migrateV3toV4({
      version: 3,
      teams: {
        t1: { id: 't1', gameConfigs: [{ id: 'c1', balancePriority: 'off' }] },
      },
      games: {},
    });
    expect(result.teams.t1.gameConfigs[0].skillBalance).toBe(false);
  });

  it('handles teams with no gameConfigs', () => {
    const result = migrateV3toV4({
      version: 3,
      teams: { t1: { id: 't1' } },
      games: {},
    });
    expect(result.teams.t1.gameConfigs).toEqual([]);
  });
});

describe('migrateV4toV5', () => {
  it('adds periodDivisions to games from linked config', () => {
    const result = migrateV4toV5({
      version: 4,
      teams: {
        t1: {
          id: 't1',
          gameConfigs: [{ id: 'cfg-1', periods: 4, rotationsPerPeriod: 2 }],
        },
      },
      games: {
        g1: {
          id: 'g1',
          teamId: 't1',
          gameConfigId: 'cfg-1',
        },
      },
    });

    expect(result.version).toBe(5);
    expect(result.games.g1.periodDivisions).toEqual([2, 2, 2, 2]);
  });

  it('preserves existing periodDivisions', () => {
    const result = migrateV4toV5({
      version: 4,
      teams: {},
      games: {
        g1: {
          id: 'g1',
          teamId: 't1',
          gameConfigId: 'cfg-1',
          periodDivisions: [1, 3, 2],
        },
      },
    });

    expect(result.games.g1.periodDivisions).toEqual([1, 3, 2]);
  });
});

describe('migrateV5toV6', () => {
  it('adds lockMode to legacy manual overrides', () => {
    const result = migrateV5toV6({
      version: 5,
      teams: {},
      games: {
        g1: {
          id: 'g1',
          manualOverrides: [
            {
              playerId: 'p1',
              rotationIndex: 0,
              assignment: 'FIELD',
            },
          ],
        },
      },
    });

    expect(result.version).toBe(6);
    expect(result.games.g1.manualOverrides).toEqual([
      {
        playerId: 'p1',
        rotationIndex: 0,
        assignment: 'FIELD',
        lockMode: 'hard',
      },
    ]);
  });

  it('preserves existing soft lock mode', () => {
    const result = migrateV5toV6({
      version: 5,
      teams: {},
      games: {
        g1: {
          id: 'g1',
          manualOverrides: [
            {
              playerId: 'p2',
              rotationIndex: 1,
              assignment: 'BENCH',
              lockMode: 'soft',
            },
          ],
        },
      },
    });

    expect(result.games.g1.manualOverrides).toEqual([
      {
        playerId: 'p2',
        rotationIndex: 1,
        assignment: 'BENCH',
        lockMode: 'soft',
      },
    ]);
  });
});

describe('migrateData resilience', () => {
  it('gracefully handles malformed team gameConfigs during migration', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const broken = {
      version: 3,
      teams: { t1: { id: 't1', name: 'A', rosters: [], gameConfigs: 'not-an-array' } },
      games: {},
    };
    localStorage.setItem('benchassist_data', JSON.stringify(broken));

    const result = loadData();
    expect(result).not.toBeNull();
    expect(result!.version).toBe(CURRENT_VERSION);
    expect(result!.teams.t1.gameConfigs).toEqual([]);
    expect(consoleSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});

describe('saveData', () => {
  it('persists data to localStorage', () => {
    const data = { version: 2, teams: {}, games: {} };
    saveData(data);
    expect(localStorage.getItem('benchassist_data')).toBe(JSON.stringify(data));
  });
});
