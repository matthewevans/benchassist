import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { TabBar } from './TabBar.tsx';

function renderWithRouter(initialEntry = '/') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <TabBar />
    </MemoryRouter>,
  );
}

describe('TabBar', () => {
  it('renders all 5 tab items', () => {
    renderWithRouter();
    expect(screen.getByText('Teams')).toBeInTheDocument();
    expect(screen.getByText('New Game')).toBeInTheDocument();
    expect(screen.getByText('Practice')).toBeInTheDocument();
    expect(screen.getByText('Games')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('marks the active tab based on current route', () => {
    renderWithRouter('/practice');
    const practiceLink = screen.getByText('Practice').closest('a');
    expect(practiceLink).toHaveAttribute('aria-current', 'page');
  });

  it('links to correct routes', () => {
    renderWithRouter();
    expect(screen.getByText('Teams').closest('a')).toHaveAttribute('href', '/');
    expect(screen.getByText('New Game').closest('a')).toHaveAttribute('href', '/games/new');
    expect(screen.getByText('Practice').closest('a')).toHaveAttribute('href', '/practice');
    expect(screen.getByText('Games').closest('a')).toHaveAttribute('href', '/games');
    expect(screen.getByText('Settings').closest('a')).toHaveAttribute('href', '/settings');
  });
});
