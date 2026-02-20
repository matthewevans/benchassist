import { generateId } from '@/utils/id.ts';
import { GAME_CONFIG_TEMPLATES, DEFAULT_GAME_RULES } from '@/types/domain.ts';
import type { GameConfig, GameConfigTemplate, TeamId } from '@/types/domain.ts';
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
