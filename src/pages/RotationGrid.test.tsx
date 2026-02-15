import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { RotationGrid } from './RotationGrid.tsx';
import { AppContext, type AppContextValue, type AppState } from '@/context/AppContext.tsx';
import { RotationAssignment } from '@/types/domain.ts';
import type { Game, Team, Roster, GameConfig } from '@/types/domain.ts';
import type { UseSolverReturn } from '@/hooks/useSolver.ts';
import type { UsePeriodTimerResult } from '@/hooks/usePeriodTimer.ts';
import {
  playerFactory,
  gameConfigFactory,
  teamFactory,
  rosterFactory,
  gameFactory,
  buildSchedule,
  buildRotation,
} from '@/test/factories.ts';

// --- Mocks ---

// jsdom doesn't implement scrollTo
Element.prototype.scrollTo = vi.fn();

const mockSolver: UseSolverReturn = {
  solve: vi.fn(),
  cancel: vi.fn(),
  reset: vi.fn(),
  progress: 0,
  message: '',
  isRunning: false,
  result: null,
  error: null,
  setError: vi.fn(),
};

vi.mock('@/hooks/useSolver.ts', () => ({
  useSolver: () => mockSolver,
}));

const mockTimer: UsePeriodTimerResult = {
  elapsedMs: 0,
  isRunning: false,
  formattedElapsed: '0:00',
  formattedDuration: '25:00',
  progress: 0,
  markers: [],
  periodIndex: 0,
  isOvertime: false,
  play: vi.fn(),
  pause: vi.fn(),
  reset: vi.fn(),
};

vi.mock('@/hooks/usePeriodTimer.ts', () => ({
  usePeriodTimer: () => mockTimer,
}));

// --- Test helpers ---

function buildTestState(): {
  state: AppState;
  game: Game;
  team: Team;
  roster: Roster;
  config: GameConfig;
} {
  const players = [
    playerFactory.build({ name: 'Alice', skillRanking: 5 }),
    playerFactory.build({ name: 'Bob', skillRanking: 4 }),
    playerFactory.build({ name: 'Carol', skillRanking: 3 }),
    playerFactory.build({ name: 'Dave', skillRanking: 2 }),
    playerFactory.build({ name: 'Eve', skillRanking: 1 }),
  ];

  const config = gameConfigFactory.build({
    fieldSize: 4,
    periods: 2,
    rotationsPerPeriod: 2,
    useGoalie: false,
    usePositions: false,
  });

  const roster: Roster = rosterFactory.build({ players });
  const team: Team = teamFactory.build({
    rosters: [roster],
    gameConfigs: [config],
  });

  const rotations = [
    buildRotation(0, {
      [players[0].id]: RotationAssignment.Field,
      [players[1].id]: RotationAssignment.Field,
      [players[2].id]: RotationAssignment.Field,
      [players[3].id]: RotationAssignment.Field,
      [players[4].id]: RotationAssignment.Bench,
    }),
    buildRotation(1, {
      [players[0].id]: RotationAssignment.Field,
      [players[1].id]: RotationAssignment.Field,
      [players[2].id]: RotationAssignment.Bench,
      [players[3].id]: RotationAssignment.Field,
      [players[4].id]: RotationAssignment.Field,
    }),
    buildRotation(2, {
      [players[0].id]: RotationAssignment.Bench,
      [players[1].id]: RotationAssignment.Field,
      [players[2].id]: RotationAssignment.Field,
      [players[3].id]: RotationAssignment.Field,
      [players[4].id]: RotationAssignment.Field,
    }),
    buildRotation(3, {
      [players[0].id]: RotationAssignment.Field,
      [players[1].id]: RotationAssignment.Bench,
      [players[2].id]: RotationAssignment.Field,
      [players[3].id]: RotationAssignment.Field,
      [players[4].id]: RotationAssignment.Field,
    }),
  ];
  rotations[0].periodIndex = 0;
  rotations[1].periodIndex = 0;
  rotations[2].periodIndex = 1;
  rotations[3].periodIndex = 1;

  const schedule = buildSchedule(rotations, players);

  const game: Game = gameFactory.build({
    teamId: team.id,
    rosterId: roster.id,
    gameConfigId: config.id,
    name: 'Test Match',
    status: 'setup',
    schedule,
  });

  const state: AppState = {
    teams: { [team.id]: team },
    games: { [game.id]: game },
  };

  return { state, game, team, roster, config };
}

function renderGrid(state: AppState, gameId: string) {
  const dispatch = vi.fn();
  const value: AppContextValue = { state, dispatch };

  const result = render(
    <AppContext.Provider value={value}>
      <MemoryRouter initialEntries={[`/games/${gameId}/rotations`]}>
        <Routes>
          <Route path="/games/:gameId/rotations" element={<RotationGrid />} />
        </Routes>
      </MemoryRouter>
    </AppContext.Provider>,
  );

  return { ...result, dispatch };
}

// --- Tests ---

describe('RotationGrid', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mutable mock state
    mockSolver.isRunning = false;
    mockSolver.progress = 0;
    mockSolver.message = '';
    mockSolver.error = null;
    mockSolver.result = null;
  });

  describe('missing game', () => {
    it('shows fallback when game does not exist', () => {
      const state: AppState = { teams: {}, games: {} };
      renderGrid(state, 'nonexistent');
      expect(screen.getByText(/Game or schedule not found/)).toBeInTheDocument();
    });
  });

  describe('setup mode', () => {
    it('renders game name and team name', () => {
      const { state, game, team } = buildTestState();
      renderGrid(state, game.id);
      expect(screen.getByText('Test Match')).toBeInTheDocument();
      expect(screen.getByText(team.name)).toBeInTheDocument();
    });

    it('shows Start Game and Regenerate buttons', () => {
      const { state, game } = buildTestState();
      renderGrid(state, game.id);
      expect(screen.getByRole('button', { name: /start game/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /regenerate/i })).toBeInTheDocument();
    });

    it('renders all players in the grid', () => {
      const { state, game } = buildTestState();
      renderGrid(state, game.id);
      // Names appear in both the grid rows and the Player Statistics section
      for (const name of ['Alice', 'Bob', 'Carol', 'Dave', 'Eve']) {
        expect(screen.getAllByText(name).length).toBeGreaterThanOrEqual(1);
      }
    });

    it('displays rotation column headers', () => {
      const { state, game } = buildTestState();
      renderGrid(state, game.id);
      expect(screen.getByText('R1')).toBeInTheDocument();
      expect(screen.getByText('R2')).toBeInTheDocument();
      expect(screen.getByText('R3')).toBeInTheDocument();
      expect(screen.getByText('R4')).toBeInTheDocument();
    });

    it('shows overall stats cards', () => {
      const { state, game } = buildTestState();
      renderGrid(state, game.id);
      expect(screen.getByText('Avg Strength')).toBeInTheDocument();
      expect(screen.getByText('Strength Range')).toBeInTheDocument();
      expect(screen.getByText('Variance')).toBeInTheDocument();
    });

    it('shows player statistics section', () => {
      const { state, game } = buildTestState();
      renderGrid(state, game.id);
      expect(screen.getByText('Player Statistics')).toBeInTheDocument();
    });

    it('shows play percentage per player', () => {
      const { state, game } = buildTestState();
      renderGrid(state, game.id);
      // Each player sits out 1 of 4 rotations = 75%
      const percentCells = screen.getAllByText('75%');
      expect(percentCells.length).toBeGreaterThanOrEqual(5);
    });

    it('dispatches UPDATE_GAME to start the game', async () => {
      const { state, game } = buildTestState();
      const { dispatch } = renderGrid(state, game.id);
      await userEvent.click(screen.getByRole('button', { name: /start game/i }));
      expect(dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'UPDATE_GAME',
          payload: expect.objectContaining({ status: 'in-progress' }),
        }),
      );
    });

    it('calls solver.solve when Regenerate is clicked', async () => {
      const { state, game } = buildTestState();
      renderGrid(state, game.id);
      await userEvent.click(screen.getByRole('button', { name: /regenerate/i }));
      expect(mockSolver.solve).toHaveBeenCalled();
    });
  });

  describe('live mode', () => {
    function buildLiveState() {
      const { state, game, ...rest } = buildTestState();
      const liveGame: Game = {
        ...game,
        status: 'in-progress',
        startedAt: Date.now(),
      };
      const liveState: AppState = {
        ...state,
        games: { [game.id]: liveGame },
      };
      return { state: liveState, game: liveGame, ...rest };
    }

    it('shows rotation counter and period', () => {
      const { state, game } = buildLiveState();
      renderGrid(state, game.id);
      expect(screen.getByText(/Rotation 1 of 4/)).toBeInTheDocument();
    });

    it('shows End Game button in header', () => {
      const { state, game } = buildLiveState();
      renderGrid(state, game.id);
      // The header has an "End Game" button (the bottom bar may also have one)
      expect(screen.getAllByRole('button', { name: /end game/i }).length).toBeGreaterThanOrEqual(1);
    });

    it('does not show stats cards or player statistics section', () => {
      const { state, game } = buildLiveState();
      renderGrid(state, game.id);
      expect(screen.queryByText('Avg Strength')).not.toBeInTheDocument();
      expect(screen.queryByText('Player Statistics')).not.toBeInTheDocument();
    });

    it('renders the LiveBottomBar with navigation', () => {
      const { state, game } = buildLiveState();
      renderGrid(state, game.id);
      expect(screen.getByRole('button', { name: /previous rotation/i })).toBeInTheDocument();
    });
  });

  describe('completed mode', () => {
    function buildCompletedState() {
      const { state, game, ...rest } = buildTestState();
      const completedGame: Game = {
        ...game,
        status: 'completed',
        startedAt: Date.now() - 3600000,
        completedAt: Date.now(),
      };
      const completedState: AppState = {
        ...state,
        games: { [game.id]: completedGame },
      };
      return { state: completedState, game: completedGame, ...rest };
    }

    it('shows completed indicator', () => {
      const { state, game } = buildCompletedState();
      renderGrid(state, game.id);
      expect(screen.getByText(/Completed/)).toBeInTheDocument();
    });

    it('does not show Start Game or advance buttons', () => {
      const { state, game } = buildCompletedState();
      renderGrid(state, game.id);
      expect(screen.queryByRole('button', { name: /start game/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /end game/i })).not.toBeInTheDocument();
    });

    it('still renders the rotation grid with player names', () => {
      const { state, game } = buildCompletedState();
      renderGrid(state, game.id);
      expect(screen.getByText('R1')).toBeInTheDocument();
      expect(screen.getAllByText('Alice').length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('swap interaction', () => {
    it('shows swap instruction after clicking a cell', async () => {
      const { state, game } = buildTestState();
      renderGrid(state, game.id);

      // Labels are "Field" and "Bench" when usePositions is false
      const fieldBadges = screen.getAllByText('Field');
      await userEvent.click(fieldBadges[0]);

      expect(screen.getByText(/Selected .+ in R1/)).toBeInTheDocument();
      expect(screen.getByText(/Click another player/)).toBeInTheDocument();
    });

    it('deselects when same cell is clicked again', async () => {
      const { state, game } = buildTestState();
      renderGrid(state, game.id);

      const fieldBadges = screen.getAllByText('Field');
      await userEvent.click(fieldBadges[0]);
      expect(screen.getByText(/Selected/)).toBeInTheDocument();

      // Click same badge again to deselect
      await userEvent.click(fieldBadges[0]);
      expect(screen.queryByText(/Selected/)).not.toBeInTheDocument();
    });

    it('dispatches SET_GAME_SCHEDULE when swapping two players in same rotation', async () => {
      const { state, game } = buildTestState();
      const { dispatch } = renderGrid(state, game.id);

      // Sorted by skill: Alice(5), Bob(4), Carol(3), Dave(2), Eve(1)
      // R1 assignments: Alice=Field, Bob=Field, Carol=Field, Dave=Field, Eve=Bench
      // In DOM order, "Bench" elements appear row-by-row:
      //   [0] Alice/R3, [1] Bob/R4, [2] Carol/R2, [3] Eve/R1
      // fieldBadges[0] = Alice/R1 (rotation 0)
      // benchBadges[3] = Eve/R1 (rotation 0) — same rotation
      const fieldBadges = screen.getAllByText('Field');
      const benchBadges = screen.getAllByText('Bench');
      await userEvent.click(fieldBadges[0]);
      await userEvent.click(benchBadges[3]);

      expect(dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'SET_GAME_SCHEDULE',
        }),
      );
    });
  });

  describe('solver states', () => {
    it('shows progress bar when solver is running', () => {
      mockSolver.isRunning = true;
      mockSolver.progress = 42;
      mockSolver.message = 'Searching...';

      const { state, game } = buildTestState();
      renderGrid(state, game.id);

      expect(screen.getByText('Searching...')).toBeInTheDocument();
      expect(screen.getByText('42%')).toBeInTheDocument();
    });

    it('shows error card when solver has an error', () => {
      mockSolver.error = 'Not enough players: 3 available, 4 needed on field';

      const { state, game } = buildTestState();
      renderGrid(state, game.id);

      expect(screen.getByText(/Not enough players/)).toBeInTheDocument();
    });
  });

  describe('team strength footer', () => {
    it('shows team strength in the table footer', () => {
      const { state, game } = buildTestState();
      renderGrid(state, game.id);
      expect(screen.getByText('Team Strength')).toBeInTheDocument();
    });
  });
});
