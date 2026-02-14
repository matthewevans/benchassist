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

  it('returns error for missing colon', () => {
    const result = parsePlayerImport('NoColon');
    expect(result).toEqual([{ name: 'NoColon', error: 'Expected format: Name: Skill' }]);
  });

  it('returns error for non-numeric skill', () => {
    const result = parsePlayerImport('Bad: abc');
    expect(result).toEqual([{ name: 'Bad', error: 'Skill must be 1-5' }]);
  });

  it('splits on last colon to handle names with colons', () => {
    const result = parsePlayerImport('Nick: Jr: 2');
    expect(result).toEqual([{ name: 'Nick: Jr', skillRanking: 2 }]);
  });

  it('returns empty array for empty input', () => {
    expect(parsePlayerImport('')).toEqual([]);
    expect(parsePlayerImport('  \n  \n  ')).toEqual([]);
  });
});
