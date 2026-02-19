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
  it('renders all 4 tab items', () => {
    renderWithRouter();
    expect(screen.getByText('Teams')).toBeInTheDocument();
    expect(screen.getByText('Games')).toBeInTheDocument();
    expect(screen.getByText('Practice')).toBeInTheDocument();
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
    expect(screen.getByText('Games').closest('a')).toHaveAttribute('href', '/games');
    expect(screen.getByText('Practice').closest('a')).toHaveAttribute('href', '/practice');
    expect(screen.getByText('Settings').closest('a')).toHaveAttribute('href', '/settings');
  });

  it('keeps Games tab active on new game flow', () => {
    renderWithRouter('/games/new');
    const gamesLink = screen.getByText('Games').closest('a');
    expect(gamesLink).toHaveAttribute('aria-current', 'page');
  });
});
