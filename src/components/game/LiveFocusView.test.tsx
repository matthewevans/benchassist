import { render, screen } from '@testing-library/react';
import { LiveFocusView } from './LiveFocusView.tsx';
import { RotationAssignment } from '@/types/domain.ts';
import { playerFactory, buildRotation } from '@/test/factories.ts';

describe('LiveFocusView', () => {
  it('shows explicit upcoming changes including position moves', () => {
    const alice = playerFactory.build({ name: 'Alice' });
    const bob = playerFactory.build({ name: 'Bob' });
    const carol = playerFactory.build({ name: 'Carol' });
    const playerMap = new Map([
      [alice.id, alice],
      [bob.id, bob],
      [carol.id, carol],
    ]);

    const currentRotation = buildRotation(0, {
      [alice.id]: RotationAssignment.Field,
      [bob.id]: RotationAssignment.Field,
      [carol.id]: RotationAssignment.Bench,
    });
    currentRotation.fieldPositions = {
      [alice.id]: 'LM',
      [bob.id]: 'RM',
    };

    const nextRotation = buildRotation(1, {
      [alice.id]: RotationAssignment.Field,
      [bob.id]: RotationAssignment.Bench,
      [carol.id]: RotationAssignment.Field,
    });
    nextRotation.fieldPositions = {
      [alice.id]: 'RM',
      [carol.id]: 'LM',
    };

    render(
      <LiveFocusView
        currentRotation={currentRotation}
        nextRotation={nextRotation}
        playerMap={playerMap}
        usePositions={true}
      />,
    );

    expect(screen.getByText('Upcoming changes')).toBeInTheDocument();
    expect(
      screen.getAllByText((_, node) => node?.textContent === 'Alice: Position LM -> RM').length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText((_, node) => node?.textContent === 'Bob: OUT RM -> Bench').length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText((_, node) => node?.textContent === 'Carol: IN Bench -> LM').length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByText('LM -> RM').length).toBeGreaterThanOrEqual(1);
  });

  it('shows last-rotation state when there is no upcoming rotation', () => {
    const alice = playerFactory.build({ name: 'Alice' });
    const playerMap = new Map([[alice.id, alice]]);
    const currentRotation = buildRotation(0, {
      [alice.id]: RotationAssignment.Field,
    });

    render(
      <LiveFocusView
        currentRotation={currentRotation}
        nextRotation={undefined}
        playerMap={playerMap}
        usePositions={false}
      />,
    );

    expect(screen.getByText('Last rotation')).toBeInTheDocument();
    expect(screen.queryByText('Upcoming changes')).not.toBeInTheDocument();
  });
});
