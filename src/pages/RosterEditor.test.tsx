import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { RosterEditor } from './RosterEditor.tsx';
import { AppContext, type AppContextValue, type AppState } from '@/context/AppContext.tsx';
import type { Team, Roster } from '@/types/domain.ts';
import { playerFactory, rosterFactory, teamFactory } from '@/test/factories.ts';

function buildTestState(): {
  state: AppState;
  team: Team;
  roster: Roster;
} {
  const players = [
    playerFactory.build({ name: 'Alice', skillRanking: 5 }),
    playerFactory.build({ name: 'Bob', skillRanking: 3 }),
  ];

  const roster: Roster = rosterFactory.build({ players });
  const team: Team = teamFactory.build({ rosters: [roster] });
  roster.teamId = team.id;

  const state: AppState = {
    teams: { [team.id]: team },
    games: {},
    favoriteDrillIds: [],
  };

  return { state, team, roster };
}

function renderEditor(state: AppState, teamId: string, rosterId: string) {
  const dispatch = vi.fn();
  const value: AppContextValue = { state, dispatch };

  const result = render(
    <AppContext.Provider value={value}>
      <MemoryRouter initialEntries={[`/teams/${teamId}/rosters/${rosterId}`]}>
        <Routes>
          <Route path="/teams/:teamId/rosters/:rosterId" element={<RosterEditor />} />
        </Routes>
      </MemoryRouter>
    </AppContext.Provider>,
  );

  return { ...result, dispatch };
}

describe('RosterEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders players in the roster', () => {
    const { state, team, roster } = buildTestState();
    renderEditor(state, team.id, roster.id);
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  describe('player delete confirmation', () => {
    it('shows confirmation dialog when Delete Player is clicked in edit sheet', async () => {
      const { state, team, roster } = buildTestState();
      renderEditor(state, team.id, roster.id);

      // Tap player name to open edit sheet
      await userEvent.click(screen.getByText('Alice'));

      // Click Delete Player in the edit sheet
      await userEvent.click(screen.getByRole('button', { name: /delete player/i }));

      expect(screen.getByText(/Remove Alice\?/)).toBeInTheDocument();
      expect(screen.getByText(/permanently remove/)).toBeInTheDocument();
    });

    it('does not dispatch when cancelled', async () => {
      const { state, team, roster } = buildTestState();
      const { dispatch } = renderEditor(state, team.id, roster.id);

      await userEvent.click(screen.getByText('Alice'));
      await userEvent.click(screen.getByRole('button', { name: /delete player/i }));
      await userEvent.click(screen.getByRole('button', { name: /cancel/i }));

      expect(dispatch).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'DELETE_PLAYER' }));
    });

    it('dispatches DELETE_PLAYER when confirmed', async () => {
      const { state, team, roster } = buildTestState();
      const { dispatch } = renderEditor(state, team.id, roster.id);

      await userEvent.click(screen.getByText('Alice'));
      await userEvent.click(screen.getByRole('button', { name: /delete player/i }));

      // The confirm button label is "Remove" in the IOSAlert
      const confirmButton = screen.getByRole('button', { name: 'Remove' });
      await userEvent.click(confirmButton);

      expect(dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'DELETE_PLAYER',
          payload: expect.objectContaining({
            teamId: team.id,
            rosterId: roster.id,
          }),
        }),
      );
    });
  });
});
