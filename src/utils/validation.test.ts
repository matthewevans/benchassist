import { describe, it, expect } from 'vitest';
import { validateRosterForGame } from './validation.ts';
import { buildRoster, gameConfigFactory } from '@/test/factories.ts';

describe('validateRosterForGame', () => {
  it('returns error when not enough players for the field size', () => {
    const players = buildRoster(5);
    const config = gameConfigFactory.build({ fieldSize: 7 });

    const errors = validateRosterForGame(players, config, []);

    expect(errors).toContainEqual(
      expect.stringContaining('Not enough players'),
    );
  });

  it('warns when all players must be on field (no subs possible)', () => {
    const players = buildRoster(7, { goalieCount: 2 });
    const config = gameConfigFactory.build({ fieldSize: 7 });

    const errors = validateRosterForGame(players, config, []);

    expect(errors).toContainEqual(
      expect.stringContaining('no substitutions possible'),
    );
  });

  it('returns error when no goalie-eligible players', () => {
    const players = buildRoster(9, { goalieCount: 0 });
    const config = gameConfigFactory.build({ fieldSize: 7 });

    const errors = validateRosterForGame(players, config, []);

    expect(errors).toContainEqual(
      expect.stringContaining('goalie-eligible'),
    );
  });

  it('accounts for absent players when checking roster validity', () => {
    const players = buildRoster(9);
    const config = gameConfigFactory.build({ fieldSize: 7 });
    const absentIds = players.slice(0, 3).map((p) => p.id);

    const errors = validateRosterForGame(players, config, absentIds);

    expect(errors).toContainEqual(
      expect.stringContaining('Not enough players'),
    );
  });

  it('returns no errors for a valid roster', () => {
    const players = buildRoster(10, { goalieCount: 3 });
    const config = gameConfigFactory.build({ fieldSize: 7, periods: 2, goalieRestAfterPeriod: true });

    const errors = validateRosterForGame(players, config, []);

    expect(errors).toHaveLength(0);
  });
});
