import { generateId } from '@/utils/id.ts';
import { GAME_CONFIG_TEMPLATES, DEFAULT_GAME_RULES } from '@/types/domain.ts';
import type { FormationSlot, GameConfig, GameConfigTemplate, TeamId } from '@/types/domain.ts';
import { getUAge } from '@/utils/age.ts';

export function createConfigFromTemplate(teamId: TeamId, template: GameConfigTemplate): GameConfig {
  return {
    id: generateId(),
    teamId,
    name: template.name,
    fieldSize: template.fieldSize,
    periods: template.periods,
    periodDurationMinutes: template.periodDurationMinutes,
    rotationsPerPeriod: template.rotationsPerPeriod,
    usePositions: template.usePositions,
    formation: template.formation,
    useGoalie: template.useGoalie,
    ...DEFAULT_GAME_RULES,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

/** Returns the GYSA template matching the team's birth year, or undefined if out of range. */
export function getGysaTemplateForBirthYear(birthYear: number): GameConfigTemplate | undefined {
  const uAge = getUAge(birthYear);
  return GAME_CONFIG_TEMPLATES.find(
    (t) =>
      t.group === 'gysa' &&
      t.gysaMinAge !== undefined &&
      t.gysaMaxAge !== undefined &&
      uAge >= t.gysaMinAge &&
      uAge <= t.gysaMaxAge,
  );
}

/**
 * Returns the most idiomatic DEF/MID/FWD formation for a given number of field players
 * (i.e. fieldSize minus GK). Used as the default when usePositions is first enabled.
 */
export function getDefaultFormation(fieldPlayerCount: number): FormationSlot[] {
  const presets: Record<number, FormationSlot[]> = {
    4: [
      { position: 'DEF', count: 2 },
      { position: 'MID', count: 1 },
      { position: 'FWD', count: 1 },
    ],
    5: [
      { position: 'DEF', count: 2 },
      { position: 'MID', count: 2 },
      { position: 'FWD', count: 1 },
    ],
    6: [
      { position: 'DEF', count: 2 },
      { position: 'MID', count: 3 },
      { position: 'FWD', count: 1 },
    ],
    7: [
      { position: 'DEF', count: 3 },
      { position: 'MID', count: 3 },
      { position: 'FWD', count: 1 },
    ],
    8: [
      { position: 'DEF', count: 3 },
      { position: 'MID', count: 3 },
      { position: 'FWD', count: 2 },
    ],
    9: [
      { position: 'DEF', count: 4 },
      { position: 'MID', count: 3 },
      { position: 'FWD', count: 2 },
    ],
    10: [
      { position: 'DEF', count: 4 },
      { position: 'MID', count: 3 },
      { position: 'FWD', count: 3 },
    ],
  };
  return presets[fieldPlayerCount] ?? [];
}

/** Produces a human-readable subtitle for a template, e.g. "7 players · 4 quarters · 12 min · Goalkeeper" */
export function formatConfigSummary(template: GameConfigTemplate): string {
  const periodLabel = template.periods === 2 ? 'halves' : 'quarters';
  const parts = [
    `${template.fieldSize} players`,
    `${template.periods} ${periodLabel}`,
    `${template.periodDurationMinutes} min`,
  ];
  if (template.useGoalie) parts.push('Goalkeeper');
  return parts.join(' · ');
}
