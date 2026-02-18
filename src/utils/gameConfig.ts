import { generateId } from '@/utils/id.ts';
import { GAME_CONFIG_TEMPLATES, DEFAULT_GAME_RULES } from '@/types/domain.ts';
import type { GameConfig, TeamId } from '@/types/domain.ts';

type GameConfigTemplate = (typeof GAME_CONFIG_TEMPLATES)[number];

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
