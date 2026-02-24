import { render, screen } from '@testing-library/react';
import { DirectEntryMatrix } from './DirectEntryMatrix.tsx';
import { RotationAssignment } from '@/types/domain.ts';

function mockViewport(isDesktop: boolean) {
  const listeners: Array<(event: MediaQueryListEvent) => void> = [];
  const mediaQuery = {
    matches: isDesktop,
    media: '(min-width: 1024px)',
    onchange: null,
    addEventListener: vi.fn((event: string, cb: (event: MediaQueryListEvent) => void) => {
      if (event === 'change') listeners.push(cb);
    }),
    removeEventListener: vi.fn((event: string, cb: (event: MediaQueryListEvent) => void) => {
      if (event !== 'change') return;
      const idx = listeners.indexOf(cb);
      if (idx >= 0) listeners.splice(idx, 1);
    }),
    addListener: vi.fn((cb: (event: MediaQueryListEvent) => void) => {
      listeners.push(cb);
    }),
    removeListener: vi.fn((cb: (event: MediaQueryListEvent) => void) => {
      const idx = listeners.indexOf(cb);
      if (idx >= 0) listeners.splice(idx, 1);
    }),
    dispatchEvent: vi.fn(),
  } as unknown as MediaQueryList;

  window.matchMedia = vi.fn().mockReturnValue(mediaQuery);
}

const baseProps = {
  slots: [
    { id: 'field:0', label: 'Field 1', assignment: RotationAssignment.Field },
    { id: 'field:1', label: 'Field 2', assignment: RotationAssignment.Field },
  ],
  totalRotations: 2,
  draft: {
    '0:field:0': { playerId: 'p1', lockMode: 'hard' as const },
  },
  playerNameById: new Map([['p1', 'Alice']]),
  currentRotationIndex: 0,
  onChangeRotation: vi.fn(),
  onSelectCell: vi.fn(),
  onToggleCellLock: vi.fn(),
};

describe('DirectEntryMatrix', () => {
  it('renders desktop matrix and hides mobile pager controls in desktop viewport', () => {
    mockViewport(true);

    render(<DirectEntryMatrix {...baseProps} />);

    expect(screen.getByText('Slot')).toBeInTheDocument();
    expect(screen.getByText('Rotation 2')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /previous rotation/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /next rotation/i })).not.toBeInTheDocument();
  });

  it('renders mobile pager controls and not desktop rotation headers in mobile viewport', () => {
    mockViewport(false);

    render(<DirectEntryMatrix {...baseProps} />);

    expect(screen.getByRole('button', { name: /previous rotation/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /next rotation/i })).toBeInTheDocument();
    expect(screen.queryByText('Rotation 2')).not.toBeInTheDocument();
    expect(screen.queryByText('Slot')).not.toBeInTheDocument();
  });
});
