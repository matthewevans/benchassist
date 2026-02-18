import { filterStorageData } from './exportImport.ts';
import {
  teamFactory,
  gameFactory,
  gameConfigFactory,
  rosterFactory,
  playerFactory,
  resetFactories,
} from '@/test/factories.ts';
import { CURRENT_VERSION, type StorageData } from './localStorage.ts';
import type { TeamSelection } from '@/hooks/useSelectionState.ts';

describe('filterStorageData', () => {
  beforeEach(() => resetFactories());

  function buildTestData(): StorageData {
    const team1 = teamFactory.build({
      id: 'team-1',
      rosters: [rosterFactory.build({ teamId: 'team-1', players: playerFactory.buildList(3) })],
      gameConfigs: [gameConfigFactory.build({ teamId: 'team-1' })],
    });
    const team2 = teamFactory.build({
      id: 'team-2',
      rosters: [rosterFactory.build({ teamId: 'team-2', players: playerFactory.buildList(2) })],
      gameConfigs: [gameConfigFactory.build({ teamId: 'team-2' })],
    });
    const game1 = gameFactory.build({ id: 'game-1', teamId: 'team-1' });
    const game2 = gameFactory.build({ id: 'game-2', teamId: 'team-2' });
    return {
      version: CURRENT_VERSION,
      teams: { 'team-1': team1, 'team-2': team2 },
      games: { 'game-1': game1, 'game-2': game2 },
    };
  }

  it('includes everything when all selected', () => {
    const data = buildTestData();
    const selections: Record<string, TeamSelection> = {
      'team-1': { rosters: true, configs: true, history: true },
      'team-2': { rosters: true, configs: true, history: true },
    };
    const result = filterStorageData(data, selections);
    expect(Object.keys(result.teams)).toEqual(['team-1', 'team-2']);
    expect(Object.keys(result.games)).toEqual(['game-1', 'game-2']);
    expect(result.teams['team-1'].rosters).toHaveLength(1);
    expect(result.teams['team-1'].gameConfigs).toHaveLength(1);
  });

  it('excludes teams not in selections', () => {
    const data = buildTestData();
    const selections: Record<string, TeamSelection> = {
      'team-1': { rosters: true, configs: true, history: true },
    };
    const result = filterStorageData(data, selections);
    expect(Object.keys(result.teams)).toEqual(['team-1']);
    expect(Object.keys(result.games)).toEqual(['game-1']);
  });

  it('strips rosters when rosters unchecked', () => {
    const data = buildTestData();
    const selections: Record<string, TeamSelection> = {
      'team-1': { rosters: false, configs: true, history: true },
    };
    const result = filterStorageData(data, selections);
    expect(result.teams['team-1'].rosters).toEqual([]);
    expect(result.teams['team-1'].gameConfigs).toHaveLength(1);
  });

  it('strips game configs when configs unchecked', () => {
    const data = buildTestData();
    const selections: Record<string, TeamSelection> = {
      'team-1': { rosters: true, configs: false, history: true },
    };
    const result = filterStorageData(data, selections);
    expect(result.teams['team-1'].gameConfigs).toEqual([]);
    expect(result.teams['team-1'].rosters).toHaveLength(1);
  });

  it('excludes games when history unchecked', () => {
    const data = buildTestData();
    const selections: Record<string, TeamSelection> = {
      'team-1': { rosters: true, configs: true, history: false },
      'team-2': { rosters: true, configs: true, history: true },
    };
    const result = filterStorageData(data, selections);
    expect(Object.keys(result.games)).toEqual(['game-2']);
  });

  it('excludes team entirely when all children unchecked', () => {
    const data = buildTestData();
    const selections: Record<string, TeamSelection> = {
      'team-1': { rosters: false, configs: false, history: false },
      'team-2': { rosters: true, configs: true, history: true },
    };
    const result = filterStorageData(data, selections);
    expect(Object.keys(result.teams)).toEqual(['team-2']);
  });

  it('preserves version and returns valid StorageData', () => {
    const data = buildTestData();
    const selections: Record<string, TeamSelection> = {
      'team-1': { rosters: true, configs: false, history: false },
    };
    const result = filterStorageData(data, selections);
    expect(result.version).toBe(CURRENT_VERSION);
    expect(result).toHaveProperty('teams');
    expect(result).toHaveProperty('games');
  });
});
