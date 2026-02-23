import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OverallStatsCards } from './OverallStatsCards.tsx';

describe('OverallStatsCards', () => {
  it('shows coach-friendly balance summary with details collapsed by default', () => {
    render(
      <OverallStatsCards
        stats={{
          avgStrength: 14.5,
          minStrength: 12,
          maxStrength: 15,
          strengthVariance: 1.3,
          violations: [],
          isValid: true,
        }}
      />,
    );

    expect(screen.getByText('Schedule Overview')).toBeInTheDocument();
    expect(screen.getByText('Lineup balance')).toBeInTheDocument();
    expect(screen.getByText('Steady')).toBeInTheDocument();
    expect(screen.getByText('Strength spread')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('12 to 15')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /show details/i })).toBeInTheDocument();
    expect(screen.queryByText('Average rotation strength')).not.toBeInTheDocument();
  });

  it('reveals advanced metrics when details are expanded', async () => {
    render(
      <OverallStatsCards
        stats={{
          avgStrength: 14.5,
          minStrength: 12,
          maxStrength: 15,
          strengthVariance: 1.3,
          violations: [],
          isValid: true,
        }}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /show details/i }));
    expect(screen.getByText('Average rotation strength')).toBeInTheDocument();
    expect(screen.getByText('14.5')).toBeInTheDocument();
    expect(screen.getByText('Consistency index')).toBeInTheDocument();
    expect(screen.getByText('1.3')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /hide details/i })).toBeInTheDocument();
  });

  it('marks broad spreads as uneven', () => {
    render(
      <OverallStatsCards
        stats={{
          avgStrength: 10,
          minStrength: 5,
          maxStrength: 13,
          strengthVariance: 4.2,
          violations: [],
          isValid: true,
        }}
      />,
    );

    expect(screen.getByText('Uneven')).toBeInTheDocument();
  });
});
