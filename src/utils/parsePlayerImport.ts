import type { SkillRanking } from '@/types/domain.ts';

export type ParsedPlayer =
  | { name: string; skillRanking: SkillRanking }
  | { name: string; error: string };

export function parsePlayerImport(text: string): ParsedPlayer[] {
  return text
    .split('\n')
    .filter((line) => line.trim() !== '')
    .map(parseLine);
}

function parseLine(line: string): ParsedPlayer {
  const lastColon = line.lastIndexOf(':');
  if (lastColon === -1) {
    return { name: line.trim(), error: 'Expected format: Name: Skill' };
  }

  const name = line.slice(0, lastColon).trim();
  if (!name) {
    return { name: line.trim(), error: 'Expected format: Name: Skill' };
  }

  const skillStr = line.slice(lastColon + 1).trim();
  const skill = Number(skillStr);

  if (!Number.isInteger(skill) || skill < 1 || skill > 5) {
    return { name, error: 'Skill must be 1-5' };
  }

  return { name, skillRanking: skill as SkillRanking };
}
