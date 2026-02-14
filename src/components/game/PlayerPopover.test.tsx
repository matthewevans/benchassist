import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PlayerPopover } from './PlayerPopover.tsx';
import type { PlayerStats } from '@/types/domain.ts';

describe('PlayerPopover', () => {
  const stats: PlayerStats = {
    playerId: 'p1',
    playerName: 'Alex',
    rotationsPlayed: 5,
    rotationsBenched: 2,
    rotationsGoalie: 1,
    totalRotations: 8,
    playPercentage: 75,
    maxConsecutiveBench: 1,
  };

  it('shows player stats when trigger is clicked', async () => {
    render(
      <PlayerPopover
        playerName="Alex"
        stats={stats}
        isRemoved={false}
        onRemove={vi.fn()}
        onAddBack={vi.fn()}
      >
        <button>Alex</button>
      </PlayerPopover>,
    );
    await userEvent.click(screen.getByText('Alex'));
    expect(screen.getByText('75%')).toBeInTheDocument();
    expect(screen.getByText(/5 played/)).toBeInTheDocument();
  });

  it('shows goalie stats when player has goalie rotations', async () => {
    render(
      <PlayerPopover
        playerName="Alex"
        stats={stats}
        isRemoved={false}
        onRemove={vi.fn()}
        onAddBack={vi.fn()}
      >
        <button>Alex</button>
      </PlayerPopover>,
    );
    await userEvent.click(screen.getByText('Alex'));
    expect(screen.getByText(/1 GK/)).toBeInTheDocument();
  });

  it('hides goalie stats when player has zero goalie rotations', async () => {
    const noGoalieStats: PlayerStats = {
      ...stats,
      rotationsGoalie: 0,
    };
    render(
      <PlayerPopover
        playerName="Alex"
        stats={noGoalieStats}
        isRemoved={false}
        onRemove={vi.fn()}
        onAddBack={vi.fn()}
      >
        <button>Alex</button>
      </PlayerPopover>,
    );
    await userEvent.click(screen.getByText('Alex'));
    expect(screen.queryByText(/GK/)).not.toBeInTheDocument();
  });

  it('shows remove button when not removed', async () => {
    const onRemove = vi.fn();
    render(
      <PlayerPopover
        playerName="Alex"
        stats={stats}
        isRemoved={false}
        onRemove={onRemove}
        onAddBack={vi.fn()}
      >
        <button>Alex</button>
      </PlayerPopover>,
    );
    await userEvent.click(screen.getByText('Alex'));
    expect(screen.getByRole('button', { name: /remove/i })).toBeInTheDocument();
  });

  it('calls onRemove when remove button is clicked', async () => {
    const onRemove = vi.fn();
    render(
      <PlayerPopover
        playerName="Alex"
        stats={stats}
        isRemoved={false}
        onRemove={onRemove}
        onAddBack={vi.fn()}
      >
        <button>Alex</button>
      </PlayerPopover>,
    );
    await userEvent.click(screen.getByText('Alex'));
    await userEvent.click(screen.getByRole('button', { name: /remove/i }));
    expect(onRemove).toHaveBeenCalledOnce();
  });

  it('shows add back button when removed', async () => {
    render(
      <PlayerPopover
        playerName="Alex"
        stats={stats}
        isRemoved={true}
        onRemove={vi.fn()}
        onAddBack={vi.fn()}
      >
        <button>Alex</button>
      </PlayerPopover>,
    );
    await userEvent.click(screen.getByText('Alex'));
    expect(screen.getByRole('button', { name: /add back/i })).toBeInTheDocument();
  });

  it('calls onAddBack when add back button is clicked', async () => {
    const onAddBack = vi.fn();
    render(
      <PlayerPopover
        playerName="Alex"
        stats={stats}
        isRemoved={true}
        onRemove={vi.fn()}
        onAddBack={onAddBack}
      >
        <button>Alex</button>
      </PlayerPopover>,
    );
    await userEvent.click(screen.getByText('Alex'));
    await userEvent.click(screen.getByRole('button', { name: /add back/i }));
    expect(onAddBack).toHaveBeenCalledOnce();
  });

  it('renders without stats', async () => {
    render(
      <PlayerPopover
        playerName="Alex"
        stats={undefined}
        isRemoved={false}
        onRemove={vi.fn()}
        onAddBack={vi.fn()}
      >
        <button>Alex</button>
      </PlayerPopover>,
    );
    await userEvent.click(screen.getByText('Alex'));
    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /remove/i })).toBeInTheDocument();
  });
});
