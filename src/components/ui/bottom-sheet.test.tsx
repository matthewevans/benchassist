import { render, screen } from '@testing-library/react';
import { BottomSheet } from './bottom-sheet.tsx';

describe('BottomSheet', () => {
  it('renders children when open', () => {
    render(
      <BottomSheet open onOpenChange={() => {}}>
        <div>Sheet Content</div>
      </BottomSheet>,
    );
    expect(screen.getByText('Sheet Content')).toBeInTheDocument();
  });

  it('does not render children when closed', () => {
    render(
      <BottomSheet open={false} onOpenChange={() => {}}>
        <div>Sheet Content</div>
      </BottomSheet>,
    );
    expect(screen.queryByText('Sheet Content')).not.toBeInTheDocument();
  });

  it('renders a grab indicator', () => {
    render(
      <BottomSheet open onOpenChange={() => {}}>
        <div>Content</div>
      </BottomSheet>,
    );
    expect(screen.getByTestId('grab-indicator')).toBeInTheDocument();
  });

  it('renders title when provided', () => {
    render(
      <BottomSheet open onOpenChange={() => {}} title="New Team">
        <div>Content</div>
      </BottomSheet>,
    );
    expect(screen.getByText('New Team')).toBeInTheDocument();
  });
});
