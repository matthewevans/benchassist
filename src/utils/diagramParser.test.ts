import { parseDiagram } from '@/utils/diagramParser.ts';

describe('parseDiagram', () => {
  it('parses a player element', () => {
    const result = parseDiagram('P 3,7 A');
    expect(result.elements).toEqual([{ type: 'player', position: { x: 3, y: 7 }, label: 'A' }]);
  });

  it('parses a player without a label', () => {
    const result = parseDiagram('P 5,5');
    expect(result.elements).toEqual([{ type: 'player', position: { x: 5, y: 5 } }]);
  });

  it('parses a defender element', () => {
    const result = parseDiagram('D 5,4');
    expect(result.elements).toEqual([{ type: 'defender', position: { x: 5, y: 4 } }]);
  });

  it('parses a defender with a label', () => {
    const result = parseDiagram('D 5,4 X');
    expect(result.elements).toEqual([{ type: 'defender', position: { x: 5, y: 4 }, label: 'X' }]);
  });

  it('parses a goalkeeper element', () => {
    const result = parseDiagram('GK 5,1');
    expect(result.elements).toEqual([{ type: 'goalkeeper', position: { x: 5, y: 1 } }]);
  });

  it('parses a cone element', () => {
    const result = parseDiagram('C 2,2');
    expect(result.elements).toEqual([{ type: 'cone', position: { x: 2, y: 2 } }]);
  });

  it('parses a ball element', () => {
    const result = parseDiagram('B 5,8');
    expect(result.elements).toEqual([{ type: 'ball', position: { x: 5, y: 8 } }]);
  });

  it('parses a goal element with two points', () => {
    const result = parseDiagram('G 3,0 7,0');
    expect(result.elements).toEqual([
      { type: 'goal', position: { x: 3, y: 0 }, position2: { x: 7, y: 0 } },
    ]);
  });

  it('parses a zone element with two points', () => {
    const result = parseDiagram('Z 1,1 9,9');
    expect(result.elements).toEqual([
      { type: 'zone', position: { x: 1, y: 1 }, position2: { x: 9, y: 9 } },
    ]);
  });

  it('parses a text label element', () => {
    const result = parseDiagram('T 5,5 "End zone"');
    expect(result.elements).toEqual([
      { type: 'text', position: { x: 5, y: 5 }, label: 'End zone' },
    ]);
  });

  it('parses multiple elements on separate lines', () => {
    const result = parseDiagram('P 2,7 A\nP 8,7 B\nD 5,4');
    expect(result.elements).toHaveLength(3);
    expect(result.elements[0]).toEqual({ type: 'player', position: { x: 2, y: 7 }, label: 'A' });
    expect(result.elements[1]).toEqual({ type: 'player', position: { x: 8, y: 7 }, label: 'B' });
    expect(result.elements[2]).toEqual({ type: 'defender', position: { x: 5, y: 4 } });
  });

  it('parses multiple elements on the same line (space-separated tokens)', () => {
    const result = parseDiagram('C 1,1  C 9,1  C 1,9  C 9,9');
    expect(result.elements).toHaveLength(4);
    expect(result.elements.every((e) => e.type === 'cone')).toBe(true);
  });

  it('ignores comments and blank lines', () => {
    const result = parseDiagram('# This is a comment\n\nP 5,5 A');
    expect(result.elements).toHaveLength(1);
  });

  it('parses a run arrow referencing a label', () => {
    const result = parseDiagram('P 2,7 A\nrun A > 5,4');
    expect(result.steps).toHaveLength(1);
    expect(result.steps[0].arrows).toHaveLength(1);
    expect(result.steps[0].arrows[0].type).toBe('run');
    expect(result.steps[0].arrows[0].points).toEqual([
      { x: 2, y: 7 },
      { x: 5, y: 4 },
    ]);
  });

  it('parses a pass arrow between two labeled elements', () => {
    const result = parseDiagram('P 2,7 A\nP 8,3 B\npass A > B');
    expect(result.steps[0].arrows[0].type).toBe('pass');
    expect(result.steps[0].arrows[0].points).toEqual([
      { x: 2, y: 7 },
      { x: 8, y: 3 },
    ]);
  });

  it('parses a run arrow with multiple waypoints', () => {
    const result = parseDiagram('P 2,7 A\nrun A > 5,4 > 8,1');
    expect(result.steps[0].arrows[0].points).toEqual([
      { x: 2, y: 7 },
      { x: 5, y: 4 },
      { x: 8, y: 1 },
    ]);
  });

  it('groups consecutive arrows into the same step', () => {
    const result = parseDiagram('P 2,7 A\nP 8,3 B\n\npass A > B\nrun A > 5,4');
    expect(result.steps).toHaveLength(1);
    expect(result.steps[0].arrows).toHaveLength(2);
  });

  it('separates steps by blank lines between arrow groups', () => {
    const input = `P 2,7 A
P 8,3 B

pass A > B
run A > 5,4

pass B > 8,1`;
    const result = parseDiagram(input);
    expect(result.steps).toHaveLength(2);
    expect(result.steps[0].arrows).toHaveLength(2);
    expect(result.steps[1].arrows).toHaveLength(1);
  });

  it('parses a full diagram (wall pass example)', () => {
    const input = `C 1,1  C 9,1  C 1,8  C 9,8
G 3,0 7,0
P 2,7 A
P 6,3 B
D 5,5
B 2,7

run A > 5,5
pass A > B

pass B > 8,1
run A > 8,1`;
    const result = parseDiagram(input);
    // 4 cones + 1 goal + 1 player A + 1 player B + 1 defender + 1 ball = 9
    expect(result.elements).toHaveLength(9);
    expect(result.steps).toHaveLength(2);
    expect(result.steps[0].arrows).toHaveLength(2);
    expect(result.steps[1].arrows).toHaveLength(2);
  });

  it('returns empty diagram for empty string', () => {
    const result = parseDiagram('');
    expect(result.elements).toEqual([]);
    expect(result.steps).toEqual([]);
  });
});
