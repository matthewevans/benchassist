import { cloneGame } from '@/utils/gameClone.ts';
import { gameFactory } from '@/test/factories.ts';
import type { RotationSchedule } from '@/types/domain.ts';

describe('cloneGame', () => {
  it('creates a new game with a different id', () => {
    const source = gameFactory.build();
    const cloned = cloneGame(source, 'Cloned Game');
    expect(cloned.id).not.toBe(source.id);
  });

  it('uses the provided name', () => {
    const source = gameFactory.build({ name: 'Original' });
    const cloned = cloneGame(source, 'Original (Copy)');
    expect(cloned.name).toBe('Original (Copy)');
  });

  it('resets status to setup', () => {
    const source = gameFactory.build({ status: 'completed' });
    const cloned = cloneGame(source, 'Copy');
    expect(cloned.status).toBe('setup');
  });

  it('preserves team, roster, and config references', () => {
    const source = gameFactory.build();
    const cloned = cloneGame(source, 'Copy');
    expect(cloned.teamId).toBe(source.teamId);
    expect(cloned.rosterId).toBe(source.rosterId);
    expect(cloned.gameConfigId).toBe(source.gameConfigId);
  });

  it('preserves the schedule', () => {
    const schedule: RotationSchedule = {
      rotations: [],
      playerStats: {},
      overallStats: { avgStrength: 0, minStrength: 0, maxStrength: 0 },
    };
    const source = gameFactory.build({ schedule });
    const cloned = cloneGame(source, 'Copy');
    expect(cloned.schedule).toStrictEqual(schedule);
  });

  it('preserves absentPlayerIds and goalieAssignments', () => {
    const source = gameFactory.build({
      absentPlayerIds: ['p1', 'p2'],
      goalieAssignments: [{ periodIndex: 0, playerId: 'p3' }],
    });
    const cloned = cloneGame(source, 'Copy');
    expect(cloned.absentPlayerIds).toEqual(['p1', 'p2']);
    expect(cloned.goalieAssignments).toEqual([{ periodIndex: 0, playerId: 'p3' }]);
  });

  it('preserves periodDivisions and manualOverrides', () => {
    const source = gameFactory.build({
      periodDivisions: [3, 3],
      manualOverrides: [
        {
          playerId: 'p1',
          rotationIndex: 0,
          assignment: 'field' as const,
          lockMode: 'hard' as const,
        },
      ],
    });
    const cloned = cloneGame(source, 'Copy');
    expect(cloned.periodDivisions).toEqual([3, 3]);
    expect(cloned.manualOverrides).toHaveLength(1);
  });

  it('resets live-game state', () => {
    const source = gameFactory.build({
      status: 'in-progress',
      currentRotationIndex: 3,
      removedPlayerIds: ['p1'],
      addedPlayerIds: ['p2'],
      periodTimerStartedAt: Date.now(),
      periodTimerPausedElapsed: 5000,
      startedAt: Date.now() - 60000,
      completedAt: null,
    });
    const cloned = cloneGame(source, 'Copy');
    expect(cloned.currentRotationIndex).toBe(0);
    expect(cloned.removedPlayerIds).toEqual([]);
    expect(cloned.addedPlayerIds).toEqual([]);
    expect(cloned.periodTimerStartedAt).toBeNull();
    expect(cloned.periodTimerPausedElapsed).toBe(0);
    expect(cloned.startedAt).toBeNull();
    expect(cloned.completedAt).toBeNull();
  });

  it('clears optimizationSuggestion', () => {
    const source = gameFactory.build({
      optimizationSuggestion: {
        currentMaxPercent: 80,
        currentExtraAtMax: 2,
        options: [],
      },
    });
    const cloned = cloneGame(source, 'Copy');
    expect(cloned.optimizationSuggestion).toBeNull();
  });

  it('sets a fresh createdAt timestamp', () => {
    const source = gameFactory.build({ createdAt: 1000 });
    const cloned = cloneGame(source, 'Copy');
    expect(cloned.createdAt).toBeGreaterThan(1000);
  });
});
