import { render } from '@testing-library/react';
import { DrillDiagram } from '@/components/DrillDiagram.tsx';

describe('DrillDiagram', () => {
  it('renders nothing when diagram is undefined', () => {
    const { container } = render(<DrillDiagram />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when diagram is empty string', () => {
    const { container } = render(<DrillDiagram diagram="" />);
    expect(container.firstChild).toBeNull();
  });

  it('renders an SVG element for a valid diagram', () => {
    const { container } = render(<DrillDiagram diagram="P 5,5 A" />);
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
  });

  it('renders player circles for P elements', () => {
    const { container } = render(<DrillDiagram diagram="P 5,5 A" />);
    const circles = container.querySelectorAll('circle');
    expect(circles.length).toBeGreaterThanOrEqual(1);
  });

  it('renders player labels as text', () => {
    const { container } = render(<DrillDiagram diagram="P 5,5 A" />);
    const texts = container.querySelectorAll('text');
    const labelText = Array.from(texts).find((t) => t.textContent === 'A');
    expect(labelText).not.toBeUndefined();
  });

  it('renders cone triangles for C elements', () => {
    const { container } = render(<DrillDiagram diagram="C 3,3" />);
    const polygons = container.querySelectorAll('polygon');
    expect(polygons.length).toBeGreaterThanOrEqual(1);
  });

  it('renders goal as a white rect for G elements', () => {
    const { container } = render(<DrillDiagram diagram="G 3,0 7,0" />);
    const rects = container.querySelectorAll('rect');
    const goalRects = Array.from(rects).filter((r) => r.getAttribute('fill') === 'white');
    expect(goalRects.length).toBeGreaterThanOrEqual(1);
  });

  it('renders zone as a dashed rectangle for Z elements', () => {
    const { container } = render(<DrillDiagram diagram="Z 1,1 9,9" />);
    const rects = container.querySelectorAll('rect');
    const dashedRect = Array.from(rects).find((r) => r.getAttribute('stroke-dasharray'));
    expect(dashedRect).not.toBeUndefined();
  });

  it('renders arrows for run/pass lines', () => {
    const { container } = render(<DrillDiagram diagram={'P 2,7 A\nP 8,3 B\npass A > B'} />);
    const lines = container.querySelectorAll('line, polyline, path');
    expect(lines.length).toBeGreaterThanOrEqual(1);
  });

  it('applies custom className', () => {
    const { container } = render(<DrillDiagram diagram="P 5,5" className="w-40" />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('class')).toContain('w-40');
  });
});
