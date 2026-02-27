import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FieldView } from './FieldView.tsx';
import { buildRotation, playerFactory } from '@/test/factories.ts';
import { RotationAssignment } from '@/types/domain.ts';
import type { Player, PlayerId, Rotation } from '@/types/domain.ts';
import type { PeriodRotationGroup } from '@/components/game/PeriodRotationIndicator.tsx';

function buildPeriodGroups(rotations: Rotation[]): PeriodRotationGroup[] {
  const groups: PeriodRotationGroup[] = [];
  for (const rotation of rotations) {
    const existing = groups.find((group) => group.periodIndex === rotation.periodIndex);
    if (existing) {
      existing.rotations.push({ index: rotation.index });
    } else {
      groups.push({ periodIndex: rotation.periodIndex, rotations: [{ index: rotation.index }] });
    }
  }
  return groups;
}

function buildFieldState(): {
  players: Player[];
  playerMap: Map<PlayerId, Player>;
  rotations: Rotation[];
} {
  const players = playerFactory.buildList(5).map((player, index) => ({
    ...player,
    name: ['Alex', 'Ben', 'Casey', 'Dev', 'Eli'][index] ?? player.name,
  }));
  const rotations = [
    buildRotation(0, {
      [players[0].id]: RotationAssignment.Field,
      [players[1].id]: RotationAssignment.Field,
      [players[2].id]: RotationAssignment.Field,
      [players[3].id]: RotationAssignment.Field,
      [players[4].id]: RotationAssignment.Bench,
    }),
    buildRotation(1, {
      [players[0].id]: RotationAssignment.Bench,
      [players[1].id]: RotationAssignment.Field,
      [players[2].id]: RotationAssignment.Field,
      [players[3].id]: RotationAssignment.Field,
      [players[4].id]: RotationAssignment.Field,
    }),
    buildRotation(2, {
      [players[0].id]: RotationAssignment.Field,
      [players[1].id]: RotationAssignment.Bench,
      [players[2].id]: RotationAssignment.Field,
      [players[3].id]: RotationAssignment.Field,
      [players[4].id]: RotationAssignment.Field,
    }),
    buildRotation(3, {
      [players[0].id]: RotationAssignment.Field,
      [players[1].id]: RotationAssignment.Field,
      [players[2].id]: RotationAssignment.Bench,
      [players[3].id]: RotationAssignment.Field,
      [players[4].id]: RotationAssignment.Field,
    }),
  ];
  rotations[0].periodIndex = 0;
  rotations[1].periodIndex = 0;
  rotations[2].periodIndex = 1;
  rotations[3].periodIndex = 1;

  const playerMap = new Map(players.map((player) => [player.id as PlayerId, player]));
  return { players, playerMap, rotations };
}

const defaultProps = {
  usePositions: false,
  useGoalie: false,
};

describe('FieldView', () => {
  it('renders player names on the field', () => {
    const { players, playerMap, rotations } = buildFieldState();
    render(
      <FieldView
        rotations={rotations}
        periodGroups={buildPeriodGroups(rotations)}
        initialRotationIndex={0}
        playerMap={playerMap}
        isLive={false}
        {...defaultProps}
      />,
    );

    // Field players should be visible; benched player should not
    for (const player of players.slice(0, 4)) {
      expect(screen.getByText(player.name)).toBeInTheDocument();
    }
    expect(screen.queryByText(players[4].name)).not.toBeInTheDocument();
  });

  it('navigates between rotations in non-live mode', async () => {
    const { playerMap, rotations } = buildFieldState();
    render(
      <FieldView
        rotations={rotations}
        periodGroups={buildPeriodGroups(rotations)}
        initialRotationIndex={0}
        playerMap={playerMap}
        isLive={false}
        showPeriodStatusIndicator={true}
        {...defaultProps}
      />,
    );

    expect(screen.getByTitle('Rotation 1 of 4 — Period 1')).toBeInTheDocument();

    // Click next to go to R2
    await userEvent.click(screen.getByRole('button', { name: /next rotation/i }));
    expect(screen.getByTitle('Rotation 2 of 4 — Period 1')).toBeInTheDocument();

    // Click next again to cross into P2
    await userEvent.click(screen.getByRole('button', { name: /next rotation/i }));
    expect(screen.getByTitle('Rotation 3 of 4 — Period 2')).toBeInTheDocument();

    // Click previous to go back
    await userEvent.click(screen.getByRole('button', { name: /previous rotation/i }));
    expect(screen.getByTitle('Rotation 2 of 4 — Period 1')).toBeInTheDocument();
  });

  it('hides preview controls when viewing the last rotation', () => {
    const { playerMap, rotations } = buildFieldState();
    render(
      <FieldView
        rotations={rotations}
        periodGroups={buildPeriodGroups(rotations)}
        initialRotationIndex={3}
        playerMap={playerMap}
        isLive={true}
        {...defaultProps}
      />,
    );

    // Last rotation should have no "Preview Next" switch
    expect(screen.queryByRole('switch', { name: /preview next/i })).not.toBeInTheDocument();
  });

  it('shows transition summary when preview is toggled on', async () => {
    const { playerMap, rotations } = buildFieldState();
    render(
      <FieldView
        rotations={rotations}
        periodGroups={buildPeriodGroups(rotations)}
        initialRotationIndex={0}
        playerMap={playerMap}
        isLive={true}
        {...defaultProps}
      />,
    );

    const previewSwitch = screen.getByRole('switch', { name: /preview next/i });
    await userEvent.click(previewSwitch);

    // After toggling, transition summary chips should appear (e.g. "1 IN", "1 OUT")
    await screen.findByText(/\d+ IN/);
    expect(screen.getByText(/\d+ OUT/)).toBeInTheDocument();
  });

  it('keeps Preview Next enabled when live rotation index changes from parent', async () => {
    const { playerMap, rotations } = buildFieldState();

    const { rerender } = render(
      <FieldView
        rotations={rotations}
        periodGroups={buildPeriodGroups(rotations)}
        initialRotationIndex={0}
        playerMap={playerMap}
        isLive={true}
        {...defaultProps}
      />,
    );

    const previewSwitch = screen.getByRole('switch', { name: /preview next/i });
    await userEvent.click(previewSwitch);
    expect(previewSwitch).toBeChecked();

    rerender(
      <FieldView
        rotations={rotations}
        periodGroups={buildPeriodGroups(rotations)}
        initialRotationIndex={1}
        playerMap={playerMap}
        isLive={true}
        {...defaultProps}
      />,
    );

    await screen.findByText('Show substitutions for R3');
    expect(screen.getByRole('switch', { name: /preview next/i })).toBeChecked();

    rerender(
      <FieldView
        rotations={rotations}
        periodGroups={buildPeriodGroups(rotations)}
        initialRotationIndex={0}
        playerMap={playerMap}
        isLive={true}
        {...defaultProps}
      />,
    );

    await screen.findByText('Show substitutions for R2');
    expect(screen.getByRole('switch', { name: /preview next/i })).toBeChecked();
  });
});
