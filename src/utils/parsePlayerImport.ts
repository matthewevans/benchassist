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

  // No colon — treat the whole line as a name, default skill to 3
  if (lastColon === -1) {
    const name = line.trim();
    return name ? { name, skillRanking: 3 } : { name, error: 'Name is required' };
  }

  const name = line.slice(0, lastColon).trim();
  if (!name) {
    return { name: line.trim(), error: 'Name is required' };
  }

  const skillStr = line.slice(lastColon + 1).trim();

  // Empty after colon (e.g. "Alex:") — default to 3
  if (!skillStr) {
    return { name, skillRanking: 3 };
  }

  const skill = Number(skillStr);
  if (!Number.isInteger(skill) || skill < 1 || skill > 5) {
    return { name, error: 'Skill must be 1-5' };
  }

  return { name, skillRanking: skill as SkillRanking };
}
