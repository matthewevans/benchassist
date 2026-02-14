import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LiveBottomBar } from './LiveBottomBar.tsx';
import type { UsePeriodTimerResult } from '@/hooks/usePeriodTimer.ts';

function buildTimer(overrides?: Partial<UsePeriodTimerResult>): UsePeriodTimerResult {
  return {
    elapsedMs: 330000,
    isRunning: true,
    formattedElapsed: '5:30',
    formattedDuration: '25:00',
    progress: 0.22,
    markers: [{ progress: 0.5, timeMs: 750000 }],
    periodIndex: 0,
    isOvertime: false,
    play: vi.fn(),
    pause: vi.fn(),
    reset: vi.fn(),
    ...overrides,
  };
}

const defaultProps = {
  timer: buildTimer(),
  onAdvance: vi.fn(),
  onRetreat: vi.fn(),
  isFirstRotation: false,
  isLastRotation: false,
  isCrossingPeriod: false,
  swapPlayerName: null,
  onCancelSwap: vi.fn(),
};

describe('LiveBottomBar', () => {
  it('renders timer display', () => {
    render(<LiveBottomBar {...defaultProps} />);
    expect(screen.getByText(/5:30/)).toBeInTheDocument();
    expect(screen.getByText(/25:00/)).toBeInTheDocument();
  });

  it('shows NEXT button', () => {
    render(<LiveBottomBar {...defaultProps} />);
    expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument();
  });

  it('shows END GAME on last rotation', () => {
    render(<LiveBottomBar {...defaultProps} isLastRotation={true} />);
    expect(screen.getByRole('button', { name: /end game/i })).toBeInTheDocument();
  });

  it('shows swap mode indicator when swapPlayerName is set', () => {
    render(<LiveBottomBar {...defaultProps} swapPlayerName="Alex" />);
    expect(screen.getByText(/Swapping Alex/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('calls onCancelSwap when cancel is clicked', async () => {
    const onCancelSwap = vi.fn();
    render(<LiveBottomBar {...defaultProps} swapPlayerName="Alex" onCancelSwap={onCancelSwap} />);
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onCancelSwap).toHaveBeenCalled();
  });

  it('shows NEXT PERIOD at period boundary', () => {
    render(<LiveBottomBar {...defaultProps} isCrossingPeriod={true} />);
    expect(screen.getByRole('button', { name: /next period/i })).toBeInTheDocument();
  });

  it('shows next sub hint when marker is ahead', () => {
    render(
      <LiveBottomBar
        {...defaultProps}
        timer={buildTimer({ elapsedMs: 330000, markers: [{ progress: 0.5, timeMs: 750000 }] })}
      />
    );
    expect(screen.getByText(/Next sub ~7 min/)).toBeInTheDocument();
  });

  it('calls onAdvance when advance button clicked', async () => {
    const onAdvance = vi.fn();
    render(<LiveBottomBar {...defaultProps} onAdvance={onAdvance} />);
    await userEvent.click(screen.getByRole('button', { name: /next/i }));
    expect(onAdvance).toHaveBeenCalled();
  });

  it('disables prev button on first rotation', () => {
    render(<LiveBottomBar {...defaultProps} isFirstRotation={true} />);
    expect(screen.getByRole('button', { name: /previous/i })).toBeDisabled();
  });

  it('calls onRetreat when prev button clicked', async () => {
    const onRetreat = vi.fn();
    render(<LiveBottomBar {...defaultProps} onRetreat={onRetreat} isFirstRotation={false} />);
    await userEvent.click(screen.getByRole('button', { name: /previous/i }));
    expect(onRetreat).toHaveBeenCalled();
  });
});
