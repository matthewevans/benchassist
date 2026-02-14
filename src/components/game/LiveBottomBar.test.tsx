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

describe('LiveBottomBar', () => {
  it('renders timer display', () => {
    render(
      <LiveBottomBar
        timer={buildTimer()}
        onAdvance={vi.fn()}
        isLastRotation={false}
        isCrossingPeriod={false}
        swapPlayerName={null}
        onCancelSwap={vi.fn()}
      />
    );
    expect(screen.getByText(/5:30/)).toBeInTheDocument();
    expect(screen.getByText(/25:00/)).toBeInTheDocument();
  });

  it('shows NEXT button', () => {
    render(
      <LiveBottomBar
        timer={buildTimer()}
        onAdvance={vi.fn()}
        isLastRotation={false}
        isCrossingPeriod={false}
        swapPlayerName={null}
        onCancelSwap={vi.fn()}
      />
    );
    expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument();
  });

  it('shows END GAME on last rotation', () => {
    render(
      <LiveBottomBar
        timer={buildTimer()}
        onAdvance={vi.fn()}
        isLastRotation={true}
        isCrossingPeriod={false}
        swapPlayerName={null}
        onCancelSwap={vi.fn()}
      />
    );
    expect(screen.getByRole('button', { name: /end game/i })).toBeInTheDocument();
  });

  it('shows swap mode indicator when swapPlayerName is set', () => {
    render(
      <LiveBottomBar
        timer={buildTimer()}
        onAdvance={vi.fn()}
        isLastRotation={false}
        isCrossingPeriod={false}
        swapPlayerName="Alex"
        onCancelSwap={vi.fn()}
      />
    );
    expect(screen.getByText(/Swapping Alex/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('calls onCancelSwap when cancel is clicked', async () => {
    const onCancelSwap = vi.fn();
    render(
      <LiveBottomBar
        timer={buildTimer()}
        onAdvance={vi.fn()}
        isLastRotation={false}
        isCrossingPeriod={false}
        swapPlayerName="Alex"
        onCancelSwap={onCancelSwap}
      />
    );
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onCancelSwap).toHaveBeenCalled();
  });

  it('shows NEXT PERIOD at period boundary', () => {
    render(
      <LiveBottomBar
        timer={buildTimer()}
        onAdvance={vi.fn()}
        isLastRotation={false}
        isCrossingPeriod={true}
        swapPlayerName={null}
        onCancelSwap={vi.fn()}
      />
    );
    expect(screen.getByRole('button', { name: /next period/i })).toBeInTheDocument();
  });

  it('shows next sub hint when marker is ahead', () => {
    render(
      <LiveBottomBar
        timer={buildTimer({ elapsedMs: 330000, markers: [{ progress: 0.5, timeMs: 750000 }] })}
        onAdvance={vi.fn()}
        isLastRotation={false}
        isCrossingPeriod={false}
        swapPlayerName={null}
        onCancelSwap={vi.fn()}
      />
    );
    expect(screen.getByText(/Next sub ~7 min/)).toBeInTheDocument();
  });

  it('calls onAdvance when advance button clicked', async () => {
    const onAdvance = vi.fn();
    render(
      <LiveBottomBar
        timer={buildTimer()}
        onAdvance={onAdvance}
        isLastRotation={false}
        isCrossingPeriod={false}
        swapPlayerName={null}
        onCancelSwap={vi.fn()}
      />
    );
    await userEvent.click(screen.getByRole('button', { name: /next/i }));
    expect(onAdvance).toHaveBeenCalled();
  });
});
