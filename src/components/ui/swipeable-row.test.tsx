import { render, screen, fireEvent } from '@testing-library/react';
import { SwipeableRow } from './swipeable-row.tsx';

describe('SwipeableRow', () => {
  it('renders children', () => {
    render(
      <SwipeableRow onDelete={() => {}}>
        <span>Player Name</span>
      </SwipeableRow>,
    );
    expect(screen.getByText('Player Name')).toBeInTheDocument();
  });

  it('reveals delete action on swipe left', () => {
    render(
      <SwipeableRow onDelete={() => {}}>
        <span>Player Name</span>
      </SwipeableRow>,
    );
    const row = screen.getByText('Player Name').closest('[data-slot="swipeable-row"]')!;
    fireEvent.touchStart(row, { touches: [{ clientX: 300, clientY: 100 }] });
    fireEvent.touchMove(row, { touches: [{ clientX: 200, clientY: 100 }] });
    fireEvent.touchEnd(row);
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
  });

  it('calls onDelete when delete button is tapped', () => {
    const onDelete = vi.fn();
    render(
      <SwipeableRow onDelete={onDelete}>
        <span>Player Name</span>
      </SwipeableRow>,
    );
    const row = screen.getByText('Player Name').closest('[data-slot="swipeable-row"]')!;
    fireEvent.touchStart(row, { touches: [{ clientX: 300, clientY: 100 }] });
    fireEvent.touchMove(row, { touches: [{ clientX: 200, clientY: 100 }] });
    fireEvent.touchEnd(row);

    const deleteBtn = screen.getByRole('button', { name: /delete/i });
    fireEvent.click(deleteBtn);
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('snaps back when swipe is below threshold', () => {
    render(
      <SwipeableRow onDelete={() => {}}>
        <span>Player Name</span>
      </SwipeableRow>,
    );
    const row = screen.getByText('Player Name').closest('[data-slot="swipeable-row"]')!;
    fireEvent.touchStart(row, { touches: [{ clientX: 300, clientY: 100 }] });
    fireEvent.touchMove(row, { touches: [{ clientX: 270, clientY: 100 }] });
    fireEvent.touchEnd(row);
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
  });
});
