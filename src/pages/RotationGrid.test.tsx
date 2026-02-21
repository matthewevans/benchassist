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
    it('renders game name and back link to Games', () => {
      const { state, game } = buildTestState();
      renderGrid(state, game.id);
      expect(screen.getAllByText('Test Match').length).toBeGreaterThanOrEqual(1);
      const backLink = screen.getByRole('link', { name: 'Back to Games' });
      expect(backLink).toHaveAttribute('href', '/games');
    });

    it('shows Start Game button and Regenerate in overflow menu', async () => {
      const { state, game } = buildTestState();
      renderGrid(state, game.id);
      expect(screen.getByRole('button', { name: /start game/i })).toBeInTheDocument();
      // Regenerate is behind the overflow menu
      await userEvent.click(screen.getByRole('button', { name: /game actions/i }));
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

    it('flags high play-percentage outliers in the grid', () => {
      const { state, game } = buildTestState();
      const { container } = renderGrid(state, game.id);

      const highDeviationFlags = container.querySelectorAll('[data-play-status="high-deviation"]');
      expect(highDeviationFlags.length).toBeGreaterThan(0);
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

    it('calls solver.solve when Regenerate is clicked from overflow menu', async () => {
      const { state, game } = buildTestState();
      renderGrid(state, game.id);
      await userEvent.click(screen.getByRole('button', { name: /game actions/i }));
      await userEvent.click(screen.getByRole('button', { name: /regenerate/i }));
      expect(mockSolver.solve).toHaveBeenCalled();
    });

    it('supports draft games without a schedule', async () => {
      const { state, game } = buildTestState();
      const draftGame: Game = { ...game, schedule: null };
      const draftState: AppState = {
        ...state,
        games: { [game.id]: draftGame },
      };

      renderGrid(draftState, game.id);

      expect(screen.getByText(/saved without rotations/i)).toBeInTheDocument();
      await userEvent.click(screen.getByRole('button', { name: /generate rotations/i }));
      expect(mockSolver.solve).toHaveBeenCalled();
    });

    it('opens period division sheet and applies a split', async () => {
      const { state, game } = buildTestState();
      const { dispatch } = renderGrid(state, game.id);

      await userEvent.click(screen.getByRole('button', { name: /period 1 actions/i }));
      expect(screen.getByText(/Period 1 Division/)).toBeInTheDocument();

      await userEvent.click(screen.getByText('3 rotations'));

      expect(dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'UPDATE_GAME',
          payload: expect.objectContaining({ periodDivisions: [3, 2] }),
        }),
      );
      expect(dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'SET_GAME_SCHEDULE',
          payload: expect.objectContaining({
            schedule: expect.objectContaining({
              rotations: expect.any(Array),
            }),
          }),
        }),
      );
    });

    it('marks unavailable merge options when period rotations conflict', async () => {
      const { state, game } = buildTestState();
      renderGrid(state, game.id);

      await userEvent.click(screen.getByRole('button', { name: /period 1 actions/i }));
      expect(screen.getByText('1 rotation')).toBeInTheDocument();
      expect(screen.getByText('Unavailable')).toBeInTheDocument();
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

    it('shows rotation progress pips with tooltip', () => {
      const { state, game } = buildLiveState();
      renderGrid(state, game.id);
      expect(screen.getByTitle(/Rotation 1 of 4/)).toBeInTheDocument();
    });

    it('shows End Game in overflow menu', async () => {
      const { state, game } = buildLiveState();
      renderGrid(state, game.id);
      // Open the overflow menu in the nav bar
      await userEvent.click(screen.getByRole('button', { name: /game actions/i }));
      expect(screen.getByRole('button', { name: /end game/i })).toBeInTheDocument();
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

    it('focus view and bottom bar follow custom period divisions in schedule', () => {
      const { state, game } = buildLiveState();
      const customRotations = game.schedule!.rotations.map((rotation, idx) => ({
        ...rotation,
        periodIndex: idx === 0 ? 0 : 1,
      }));
      const customGame: Game = {
        ...game,
        periodDivisions: [1, 3],
        currentRotationIndex: 1,
        schedule: {
          ...game.schedule!,
          rotations: customRotations,
        },
      };
      const customState: AppState = {
        ...state,
        games: { [game.id]: customGame },
      };

      renderGrid(customState, game.id);

      expect(screen.getByText('Rotation 2')).toBeInTheDocument();
      expect(screen.getByText('Rotation 3')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^next$/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /next period/i })).not.toBeInTheDocument();
    });

    it('shows Next Period when custom divisions cross a period boundary', () => {
      const { state, game } = buildLiveState();
      const customRotations = game.schedule!.rotations.map((rotation, idx) => ({
        ...rotation,
        periodIndex: idx === 0 ? 0 : 1,
      }));
      const customGame: Game = {
        ...game,
        periodDivisions: [1, 3],
        currentRotationIndex: 0,
        schedule: {
          ...game.schedule!,
          rotations: customRotations,
        },
      };
      const customState: AppState = {
        ...state,
        games: { [game.id]: customGame },
      };

      renderGrid(customState, game.id);
      expect(screen.getByRole('button', { name: /next period/i })).toBeInTheDocument();
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

      // Labels are "●" (field) and "○" (bench) when usePositions is false
      const fieldBadges = screen.getAllByText('●');
      await userEvent.click(fieldBadges[0]);

      expect(screen.getByText(/Selected .+ in R1/)).toBeInTheDocument();
      expect(screen.getByText(/Tap another player/)).toBeInTheDocument();
    });

    it('deselects when same cell is clicked again', async () => {
      const { state, game } = buildTestState();
      renderGrid(state, game.id);

      const fieldBadges = screen.getAllByText('●');
      await userEvent.click(fieldBadges[0]);
      expect(screen.getByText(/Selected/)).toBeInTheDocument();

      // Click same badge again to deselect
      await userEvent.click(fieldBadges[0]);
      expect(screen.queryByText(/Selected/)).not.toBeInTheDocument();
    });

    it('shows swap scope dialog and dispatches on "Just This Rotation"', async () => {
      const { state, game } = buildTestState();
      const { dispatch } = renderGrid(state, game.id);

      // Sorted by skill: Alice(5), Bob(4), Carol(3), Dave(2), Eve(1)
      // R1 assignments: Alice=Field, Bob=Field, Carol=Field, Dave=Field, Eve=Bench
      // In DOM order, "○" (bench) elements appear row-by-row:
      //   [0] Alice/R3, [1] Bob/R4, [2] Carol/R2, [3] Eve/R1
      // fieldBadges[0] = Alice/R1 (rotation 0)
      // benchBadges[3] = Eve/R1 (rotation 0) — same rotation
      const fieldBadges = screen.getAllByText('●');
      const benchBadges = screen.getAllByText('○');
      await userEvent.click(fieldBadges[0]);
      await userEvent.click(benchBadges[3]);

      // Dialog should appear
      expect(screen.getByText(/Swap Alice and Eve/)).toBeInTheDocument();

      // Click "Just This Rotation"
      await userEvent.click(screen.getByRole('button', { name: 'Just This Rotation' }));

      expect(dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'SET_GAME_SCHEDULE',
        }),
      );
    });

    it('dispatches swap for all remaining rotations', async () => {
      const { state, game } = buildTestState();
      const { dispatch } = renderGrid(state, game.id);

      const fieldBadges = screen.getAllByText('●');
      const benchBadges = screen.getAllByText('○');
      await userEvent.click(fieldBadges[0]);
      await userEvent.click(benchBadges[3]);

      // Click "All Remaining"
      await userEvent.click(screen.getByRole('button', { name: 'All Remaining' }));

      expect(dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'SET_GAME_SCHEDULE',
        }),
      );
    });
  });

  describe('live swap interaction', () => {
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

    it('allows field-to-field swap on current rotation in live mode', async () => {
      const { state, game } = buildLiveState();
      const { dispatch } = renderGrid(state, game.id);

      // Switch from focus view (default in live mode) to grid view so cells are interactive
      await userEvent.click(screen.getByRole('tab', { name: 'Grid' }));

      // R1 (current rotation, index 0): Alice=Field, Bob=Field, Carol=Field, Dave=Field, Eve=Bench
      // In live mode, period 1 is collapsed (future), so only R1 and R2 are visible.
      // Field badges in DOM order (row by row): [0]=Alice/R1, [1]=Alice/R2, [2]=Bob/R1, [3]=Bob/R2
      const fieldBadges = screen.getAllByText('●');
      await userEvent.click(fieldBadges[0]); // Alice in R1
      await userEvent.click(fieldBadges[2]); // Bob in R1

      // Swap dialog should appear — both are field players on current rotation
      expect(screen.getByText(/Swap Alice and Bob/)).toBeInTheDocument();

      await userEvent.click(screen.getByRole('button', { name: 'Just This Rotation' }));
      expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'SET_GAME_SCHEDULE' }));
    });

    it('disables period actions for periods that already started', async () => {
      const { state, game } = buildLiveState();
      const startedState: AppState = {
        ...state,
        games: {
          [game.id]: {
            ...game,
            currentRotationIndex: 1, // already in period 1
          },
        },
      };

      renderGrid(startedState, game.id);
      await userEvent.click(screen.getByRole('tab', { name: 'Grid' }));

      expect(screen.getByRole('button', { name: /period 1 actions/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /period 2 actions/i })).not.toBeDisabled();
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

  describe('breadcrumb navigation', () => {
    it('renders back link to Games in setup mode', () => {
      const { state, game } = buildTestState();
      renderGrid(state, game.id);
      const backLink = screen.getByRole('link', { name: 'Back to Games' });
      expect(backLink).toBeInTheDocument();
      expect(backLink).toHaveAttribute('href', '/games');
    });
  });

  describe('end-game confirmation', () => {
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

    it('shows confirmation dialog when End Game clicked from overflow menu', async () => {
      const { state, game } = buildLiveState();
      renderGrid(state, game.id);

      // Open overflow menu then click End Game
      await userEvent.click(screen.getByRole('button', { name: /game actions/i }));
      await userEvent.click(screen.getByRole('button', { name: /end game/i }));

      expect(screen.getByText('End Game?')).toBeInTheDocument();
      expect(screen.getByText(/mark the game as completed/)).toBeInTheDocument();
    });

    it('does not dispatch when dialog is cancelled', async () => {
      const { state, game } = buildLiveState();
      const { dispatch } = renderGrid(state, game.id);

      await userEvent.click(screen.getByRole('button', { name: /game actions/i }));
      await userEvent.click(screen.getByRole('button', { name: /end game/i }));

      await userEvent.click(screen.getByRole('button', { name: /cancel/i }));

      expect(dispatch).not.toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({ status: 'completed' }),
        }),
      );
    });

    it('dispatches UPDATE_GAME with completed status when confirmed', async () => {
      const { state, game } = buildLiveState();
      const { dispatch } = renderGrid(state, game.id);

      await userEvent.click(screen.getByRole('button', { name: /game actions/i }));
      await userEvent.click(screen.getByRole('button', { name: /end game/i }));

      // Confirm in the IOSAlert dialog
      await userEvent.click(screen.getByRole('button', { name: 'End Game' }));

      expect(dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'UPDATE_GAME',
          payload: expect.objectContaining({ status: 'completed' }),
        }),
      );
    });

    it('shows confirmation when advancing past last rotation', async () => {
      const { state, game } = buildLiveState();
      // Put game on last rotation (index 3, total of 4)
      const lastRotGame: Game = { ...game, currentRotationIndex: 3 };
      const lastRotState: AppState = {
        ...state,
        games: { [game.id]: lastRotGame },
      };
      renderGrid(lastRotState, game.id);

      // On the last rotation, LiveBottomBar shows "End Game" on the advance button
      await userEvent.click(screen.getByRole('button', { name: /end game/i }));

      expect(screen.getByText('End Game?')).toBeInTheDocument();
    });
  });
});
