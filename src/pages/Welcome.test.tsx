import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AppContext, type AppContextValue } from '@/context/AppContext.tsx';
import { Welcome } from '@/pages/Welcome.tsx';
import { hasBeenWelcomed, markWelcomed } from '@/storage/welcomed.ts';

const WELCOMED_KEY = 'benchassist_welcomed';

function renderWelcome(onComplete = vi.fn()) {
  const mockContext: AppContextValue = {
    state: { teams: {}, games: {}, favoriteDrillIds: [] },
    dispatch: vi.fn(),
    undo: () => null,
    canUndo: false,
  };

  return {
    onComplete,
    ...render(
      <MemoryRouter>
        <AppContext.Provider value={mockContext}>
          <Welcome onComplete={onComplete} />
        </AppContext.Provider>
      </MemoryRouter>,
    ),
  };
}

describe('Welcome', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders welcome title and buttons', () => {
    renderWelcome();
    expect(screen.getByText('Welcome to BenchBoss')).toBeInTheDocument();
    expect(screen.getByText('Get Started')).toBeInTheDocument();
    expect(screen.getByText('Restore from Backup')).toBeInTheDocument();
  });

  it('sets welcomed flag and calls onComplete when Get Started is clicked', async () => {
    const { onComplete } = renderWelcome();
    await userEvent.click(screen.getByText('Get Started'));
    expect(localStorage.getItem(WELCOMED_KEY)).toBe('true');
    expect(onComplete).toHaveBeenCalled();
  });

  it('opens import dialog when Restore from Backup is clicked', async () => {
    renderWelcome();
    await userEvent.click(screen.getByText('Restore from Backup'));
    expect(screen.getByText('Import Backup')).toBeInTheDocument();
  });
});

describe('hasBeenWelcomed', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns false when no flag is set', () => {
    expect(hasBeenWelcomed()).toBe(false);
  });

  it('returns true after markWelcomed', () => {
    markWelcomed();
    expect(hasBeenWelcomed()).toBe(true);
  });
});
