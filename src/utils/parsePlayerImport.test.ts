import { describe, it, expect } from 'vitest';
import { parsePlayerImport } from './parsePlayerImport.ts';

describe('parsePlayerImport', () => {
  it('parses valid lines into name and skill', () => {
    const result = parsePlayerImport('Sloane: 4\nElla: 5');
    expect(result).toEqual([
      { name: 'Sloane', skillRanking: 4 },
      { name: 'Ella', skillRanking: 5 },
    ]);
  });

  it('trims whitespace from names', () => {
    const result = parsePlayerImport('  Ava G  : 3  ');
    expect(result).toEqual([{ name: 'Ava G', skillRanking: 3 }]);
  });

  it('skips blank lines', () => {
    const result = parsePlayerImport('Sloane: 4\n\n\nElla: 5');
    expect(result).toHaveLength(2);
  });

  it('returns error for invalid skill ranking', () => {
    const result = parsePlayerImport('Bad: 9');
    expect(result).toEqual([{ name: 'Bad', error: 'Skill must be 1-5' }]);
  });

  it('defaults skill to 3 when no colon is present', () => {
    const result = parsePlayerImport('NoColon');
    expect(result).toEqual([{ name: 'NoColon', skillRanking: 3 }]);
  });

  it('defaults skill to 3 when colon is present but skill is empty', () => {
    const result = parsePlayerImport('Alex:');
    expect(result).toEqual([{ name: 'Alex', skillRanking: 3 }]);
  });

  it('parses a plain list of names defaulting all skills to 3', () => {
    const result = parsePlayerImport('Alice\nBob\nCarol');
    expect(result).toEqual([
      { name: 'Alice', skillRanking: 3 },
      { name: 'Bob', skillRanking: 3 },
      { name: 'Carol', skillRanking: 3 },
    ]);
  });

  it('returns error for non-numeric skill', () => {
    const result = parsePlayerImport('Bad: abc');
    expect(result).toEqual([{ name: 'Bad', error: 'Skill must be 1-5' }]);
  });

  it('splits on last colon to handle names with colons', () => {
    const result = parsePlayerImport('Nick: Jr: 2');
    expect(result).toEqual([{ name: 'Nick: Jr', skillRanking: 2 }]);
  });

  it('returns error for empty name', () => {
    const result = parsePlayerImport(': 3');
    expect(result).toEqual([{ name: ': 3', error: 'Name is required' }]);
  });

  it('returns empty array for empty input', () => {
    expect(parsePlayerImport('')).toEqual([]);
    expect(parsePlayerImport('  \n  \n  ')).toEqual([]);
  });
});
