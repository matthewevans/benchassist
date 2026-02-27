import { render, screen, waitFor, within } from '@testing-library/react';
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
    mockSolver.reset = vi.fn(() => {
      mockSolver.result = null;
      mockSolver.error = null;
      mockSolver.isRunning = false;
      mockSolver.progress = 0;
      mockSolver.message = '';
    });
  });

  describe('missing game', () => {
    it('shows fallback when game does not exist', () => {
      const state: AppState = { teams: {}, games: {} };
      renderGrid(state, 'nonexistent');
      expect(screen.getByText(/Game or schedule not found/)).toBeInTheDocument();
    });
  });

  describe('setup mode', () => {
    it('renders setup nav title, mode context, and back link to Games', () => {
      const { state, game } = buildTestState();
      renderGrid(state, game.id);
      expect(screen.getByRole('heading', { name: 'Game' })).toBeInTheDocument();
      expect(screen.queryByTitle(/Rotation 1 of 4/)).not.toBeInTheDocument();
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
      expect(screen.getByRole('button', { name: /coach plan/i })).toBeInTheDocument();
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

    it('shows compact setup balance summary with help icon in the context rail', () => {
      const { state, game } = buildTestState();
      renderGrid(state, game.id);
      expect(screen.getByText(/Very steady|Steady|Mixed|Uneven/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /what is strength spread/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /show details/i })).not.toBeInTheDocument();
    });

    it('shows a single period indicator in setup field tab and updates it with chevrons', async () => {
      const { state, game } = buildTestState();
      renderGrid(state, game.id);

      expect(screen.queryByTitle(/Rotation 1 of 4 — Period 1/)).not.toBeInTheDocument();

      await userEvent.click(screen.getByRole('tab', { name: /field/i }));

      expect(screen.getAllByTitle(/Rotation 1 of 4 — Period 1/)).toHaveLength(1);

      await userEvent.click(screen.getByRole('button', { name: /next rotation/i }));
      expect(screen.getByTitle(/Rotation 2 of 4 — Period 1/)).toBeInTheDocument();
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

      expect(screen.getByText(/no rotations yet/i)).toBeInTheDocument();
      expect(screen.getByText(/or enter your own plan/i)).toBeInTheDocument();
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

    it('opens optimize sheet and previews the selected division option', async () => {
      const { state, game } = buildTestState();
      state.games[game.id] = {
        ...game,
        optimizationSuggestion: {
          currentGap: 25,
          currentMaxPercent: 75,
          currentMinPercent: 50,
          currentExtraCount: 2,
          options: [
            {
              periodDivisions: [2, 2],
              totalRotations: 4,
              expectedGap: 25,
              expectedMaxPercent: 75,
              expectedMinPercent: 50,
              expectedExtraCount: 2,
              gapImprovement: 0,
            },
            {
              periodDivisions: [3, 2],
              totalRotations: 5,
              expectedGap: 20,
              expectedMaxPercent: 60,
              expectedMinPercent: 40,
              expectedExtraCount: 3,
              gapImprovement: 5,
            },
          ],
        },
      };

      renderGrid(state, game.id);

      await userEvent.click(screen.getByRole('button', { name: /^review$/i }));
      expect(screen.queryByText('Split Period 1')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /more options/i })).toBeInTheDocument();
      const selectedSummary = screen.getByTestId('optimize-selected-summary');
      expect(within(selectedSummary).getByText(/2-2/i)).toBeInTheDocument();
      expect(within(selectedSummary).getByText(/4 rotations/i)).toBeInTheDocument();

      await userEvent.click(screen.getByRole('button', { name: /more options/i }));
      await userEvent.click(screen.getByText('Split Period 1'));
      expect(within(selectedSummary).getByText(/Split Period 1/i)).toBeInTheDocument();
      expect(within(selectedSummary).getByText(/5 rotations/i)).toBeInTheDocument();
      await userEvent.click(screen.getByRole('button', { name: /preview/i }));

      expect(mockSolver.solve).toHaveBeenCalledWith(
        expect.objectContaining({
          periodDivisions: [3, 2],
          skipOptimizationCheck: true,
        }),
      );
    });

    it('hides larger optimization groups by default and reveals them on demand', async () => {
      const { state, game } = buildTestState();
      state.games[game.id] = {
        ...game,
        optimizationSuggestion: {
          currentGap: 25,
          currentMaxPercent: 75,
          currentMinPercent: 50,
          currentExtraCount: 2,
          options: [
            {
              periodDivisions: [3, 2],
              totalRotations: 5,
              expectedGap: 20,
              expectedMaxPercent: 60,
              expectedMinPercent: 40,
              expectedExtraCount: 3,
              gapImprovement: 5,
            },
            {
              periodDivisions: [3, 3],
              totalRotations: 6,
              expectedGap: 16,
              expectedMaxPercent: 58,
              expectedMinPercent: 42,
              expectedExtraCount: 3,
              gapImprovement: 9,
            },
            {
              periodDivisions: [4, 3],
              totalRotations: 7,
              expectedGap: 14,
              expectedMaxPercent: 57,
              expectedMinPercent: 43,
              expectedExtraCount: 4,
              gapImprovement: 11,
            },
          ],
        },
      };

      renderGrid(state, game.id);
      await userEvent.click(screen.getByRole('button', { name: /^review$/i }));

      expect(screen.queryByText('Change +1 rotations')).not.toBeInTheDocument();
      expect(screen.queryByText('Change +2 rotations')).not.toBeInTheDocument();
      expect(screen.queryByText('Change +3 rotations')).not.toBeInTheDocument();

      await userEvent.click(screen.getByRole('button', { name: /more options/i }));
      expect(screen.getByText('Change +1 rotations')).toBeInTheDocument();
      expect(screen.queryByText('Change +2 rotations')).not.toBeInTheDocument();
      expect(screen.queryByText('Change +3 rotations')).not.toBeInTheDocument();
      await userEvent.click(screen.getByRole('button', { name: /show more options/i }));
      expect(screen.getByText('Change +2 rotations')).toBeInTheDocument();
      expect(screen.getByText('Change +3 rotations')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /show fewer options/i })).toBeInTheDocument();
    });

    it('preserves hard goalie locks during optimize preview solve', async () => {
      const { state, game, config } = buildTestState();
      const goaliePlayerId = state.teams[game.teamId].rosters[0].players[0].id;
      state.teams[game.teamId] = {
        ...state.teams[game.teamId],
        gameConfigs: state.teams[game.teamId].gameConfigs.map((existing) =>
          existing.id === config.id ? { ...existing, useGoalie: true } : existing,
        ),
      };
      state.games[game.id] = {
        ...game,
        goalieAssignments: [{ periodIndex: 0, playerId: goaliePlayerId }],
        manualOverrides: [
          {
            playerId: goaliePlayerId,
            rotationIndex: 0,
            assignment: RotationAssignment.Goalie,
            lockMode: 'hard',
          },
        ],
        optimizationSuggestion: {
          currentGap: 25,
          currentMaxPercent: 75,
          currentMinPercent: 50,
          currentExtraCount: 2,
          options: [
            {
              periodDivisions: [2, 2],
              totalRotations: 4,
              expectedGap: 25,
              expectedMaxPercent: 75,
              expectedMinPercent: 50,
              expectedExtraCount: 2,
              gapImprovement: 0,
            },
            {
              periodDivisions: [3, 2],
              totalRotations: 5,
              expectedGap: 20,
              expectedMaxPercent: 60,
              expectedMinPercent: 40,
              expectedExtraCount: 3,
              gapImprovement: 5,
            },
          ],
        },
      };

      renderGrid(state, game.id);

      await userEvent.click(screen.getByRole('button', { name: /^review$/i }));
      await userEvent.click(screen.getByRole('button', { name: /more options/i }));
      await userEvent.click(screen.getByText('Split Period 1'));
      await userEvent.click(screen.getByRole('button', { name: /preview/i }));

      expect(mockSolver.solve).toHaveBeenCalledWith(
        expect.objectContaining({
          goalieAssignments: [{ periodIndex: 0, playerId: goaliePlayerId }],
          manualOverrides: [
            expect.objectContaining({
              playerId: goaliePlayerId,
              assignment: RotationAssignment.Goalie,
              lockMode: 'hard',
            }),
          ],
          periodDivisions: [3, 2],
          skipOptimizationCheck: true,
        }),
      );
    });

    it('remaps hard goalie locks to the selected optimize divisions', async () => {
      const { state, game, config } = buildTestState();
      const goaliePlayerId = state.teams[game.teamId].rosters[0].players[0].id;
      state.teams[game.teamId] = {
        ...state.teams[game.teamId],
        gameConfigs: state.teams[game.teamId].gameConfigs.map((existing) =>
          existing.id === config.id ? { ...existing, useGoalie: true } : existing,
        ),
      };
      state.games[game.id] = {
        ...game,
        manualOverrides: [
          {
            playerId: goaliePlayerId,
            rotationIndex: 2,
            assignment: RotationAssignment.Goalie,
            lockMode: 'hard',
          },
        ],
        optimizationSuggestion: {
          currentGap: 25,
          currentMaxPercent: 75,
          currentMinPercent: 50,
          currentExtraCount: 2,
          options: [
            {
              periodDivisions: [2, 2],
              totalRotations: 4,
              expectedGap: 25,
              expectedMaxPercent: 75,
              expectedMinPercent: 50,
              expectedExtraCount: 2,
              gapImprovement: 0,
            },
            {
              periodDivisions: [3, 2],
              totalRotations: 5,
              expectedGap: 20,
              expectedMaxPercent: 60,
              expectedMinPercent: 40,
              expectedExtraCount: 3,
              gapImprovement: 5,
            },
          ],
        },
      };

      renderGrid(state, game.id);

      await userEvent.click(screen.getByRole('button', { name: /^review$/i }));
      await userEvent.click(screen.getByRole('button', { name: /more options/i }));
      await userEvent.click(screen.getByText('Split Period 1'));
      await userEvent.click(screen.getByRole('button', { name: /preview/i }));

      expect(mockSolver.solve).toHaveBeenCalledWith(
        expect.objectContaining({
          manualOverrides: [
            expect.objectContaining({
              playerId: goaliePlayerId,
              assignment: RotationAssignment.Goalie,
              lockMode: 'hard',
              rotationIndex: 3,
            }),
          ],
          periodDivisions: [3, 2],
          skipOptimizationCheck: true,
        }),
      );
    });

    it('sends mapped position continuity preferences for optimize preview', async () => {
      const { state, game, config } = buildTestState();
      const players = state.teams[game.teamId].rosters[0].players;
      const continuityPlayerId = players[1].id;
      const scheduleWithPositions = {
        ...game.schedule!,
        rotations: game.schedule!.rotations.map((rotation) =>
          rotation.index === 2
            ? {
                ...rotation,
                fieldPositions: {
                  [players[1].id]: 'LB',
                  [players[2].id]: 'CB',
                  [players[3].id]: 'CM',
                  [players[4].id]: 'ST',
                },
              }
            : rotation,
        ),
      };

      state.teams[game.teamId] = {
        ...state.teams[game.teamId],
        gameConfigs: state.teams[game.teamId].gameConfigs.map((existing) =>
          existing.id === config.id
            ? {
                ...existing,
                usePositions: true,
                formation: [
                  { position: 'DEF', count: 2 },
                  { position: 'MID', count: 1 },
                  { position: 'FWD', count: 1 },
                ],
              }
            : existing,
        ),
      };
      state.games[game.id] = {
        ...game,
        schedule: scheduleWithPositions,
        optimizationSuggestion: {
          currentGap: 25,
          currentMaxPercent: 75,
          currentMinPercent: 50,
          currentExtraCount: 2,
          options: [
            {
              periodDivisions: [2, 2],
              totalRotations: 4,
              expectedGap: 25,
              expectedMaxPercent: 75,
              expectedMinPercent: 50,
              expectedExtraCount: 2,
              gapImprovement: 0,
            },
            {
              periodDivisions: [3, 2],
              totalRotations: 5,
              expectedGap: 20,
              expectedMaxPercent: 60,
              expectedMinPercent: 40,
              expectedExtraCount: 3,
              gapImprovement: 5,
            },
          ],
        },
      };

      renderGrid(state, game.id);

      await userEvent.click(screen.getByRole('button', { name: /^review$/i }));
      await userEvent.click(screen.getByRole('button', { name: /more options/i }));
      await userEvent.click(screen.getByText('Split Period 1'));
      await userEvent.click(screen.getByRole('button', { name: /preview/i }));

      expect(mockSolver.solve).toHaveBeenCalledWith(
        expect.objectContaining({
          positionContinuityPreferences: expect.arrayContaining([
            expect.objectContaining({
              playerId: continuityPlayerId,
              rotationIndex: 3,
              fieldPosition: 'LB',
            }),
          ]),
          periodDivisions: [3, 2],
          skipOptimizationCheck: true,
        }),
      );
    });

    it('applies continuity preferences to all new rotations when a period is split', async () => {
      const players = [
        playerFactory.build({
          name: 'A',
          skillRanking: 5,
          canPlayGoalie: false,
          primaryPosition: null,
        }),
        playerFactory.build({
          name: 'B',
          skillRanking: 4,
          canPlayGoalie: false,
          primaryPosition: null,
        }),
        playerFactory.build({
          name: 'C',
          skillRanking: 3,
          canPlayGoalie: false,
          primaryPosition: null,
        }),
        playerFactory.build({
          name: 'D',
          skillRanking: 2,
          canPlayGoalie: false,
          primaryPosition: null,
        }),
        playerFactory.build({
          name: 'E',
          skillRanking: 1,
          canPlayGoalie: false,
          primaryPosition: null,
        }),
      ];
      const config = gameConfigFactory.build({
        fieldSize: 4,
        periods: 2,
        rotationsPerPeriod: 1,
        useGoalie: false,
        usePositions: true,
        formation: [
          { position: 'DEF', count: 2 },
          { position: 'MID', count: 1 },
          { position: 'FWD', count: 1 },
        ],
      });
      const roster: Roster = rosterFactory.build({ players });
      const team: Team = teamFactory.build({
        rosters: [roster],
        gameConfigs: [config],
      });
      const period0PlayerId = players[0].id;
      const rotations = [
        {
          ...buildRotation(0, {
            [players[0].id]: RotationAssignment.Field,
            [players[1].id]: RotationAssignment.Field,
            [players[2].id]: RotationAssignment.Field,
            [players[3].id]: RotationAssignment.Field,
            [players[4].id]: RotationAssignment.Bench,
          }),
          periodIndex: 0,
          fieldPositions: {
            [players[0].id]: 'LB',
            [players[1].id]: 'RB',
            [players[2].id]: 'CM',
            [players[3].id]: 'ST',
          },
        },
        {
          ...buildRotation(1, {
            [players[0].id]: RotationAssignment.Bench,
            [players[1].id]: RotationAssignment.Field,
            [players[2].id]: RotationAssignment.Field,
            [players[3].id]: RotationAssignment.Field,
            [players[4].id]: RotationAssignment.Field,
          }),
          periodIndex: 1,
          fieldPositions: {
            [players[1].id]: 'LB',
            [players[2].id]: 'RB',
            [players[3].id]: 'CM',
            [players[4].id]: 'ST',
          },
        },
      ];
      const schedule = buildSchedule(rotations, players);
      const game: Game = gameFactory.build({
        teamId: team.id,
        rosterId: roster.id,
        gameConfigId: config.id,
        status: 'setup',
        schedule,
        periodDivisions: [1, 1],
        optimizationSuggestion: {
          currentGap: 20,
          currentMaxPercent: 60,
          currentMinPercent: 40,
          currentExtraCount: 1,
          options: [
            {
              periodDivisions: [1, 1],
              totalRotations: 2,
              expectedGap: 20,
              expectedMaxPercent: 60,
              expectedMinPercent: 40,
              expectedExtraCount: 1,
              gapImprovement: 0,
            },
            {
              periodDivisions: [2, 1],
              totalRotations: 3,
              expectedGap: 10,
              expectedMaxPercent: 55,
              expectedMinPercent: 45,
              expectedExtraCount: 2,
              gapImprovement: 10,
            },
          ],
        },
      });
      const customState: AppState = {
        teams: { [team.id]: team },
        games: { [game.id]: game },
      };

      renderGrid(customState, game.id);
      await userEvent.click(screen.getByRole('button', { name: /^review$/i }));
      await userEvent.click(screen.getByRole('button', { name: /more options/i }));
      await userEvent.click(screen.getByText('Split Period 1'));
      await userEvent.click(screen.getByRole('button', { name: /preview/i }));

      expect(mockSolver.solve).toHaveBeenCalledWith(
        expect.objectContaining({
          positionContinuityPreferences: expect.arrayContaining([
            expect.objectContaining({
              playerId: period0PlayerId,
              rotationIndex: 0,
              fieldPosition: 'LB',
            }),
            expect.objectContaining({
              playerId: period0PlayerId,
              rotationIndex: 1,
              fieldPosition: 'LB',
            }),
          ]),
          periodDivisions: [2, 1],
          skipOptimizationCheck: true,
        }),
      );
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

    it('regenerates from the active sub-period in live mode', async () => {
      const players = [
        playerFactory.build({ name: 'A', skillRanking: 5 }),
        playerFactory.build({ name: 'B', skillRanking: 4 }),
        playerFactory.build({ name: 'C', skillRanking: 3 }),
        playerFactory.build({ name: 'D', skillRanking: 2 }),
        playerFactory.build({ name: 'E', skillRanking: 1 }),
        playerFactory.build({ name: 'F', skillRanking: 1 }),
      ];

      const config = gameConfigFactory.build({
        fieldSize: 4,
        periods: 4,
        rotationsPerPeriod: 1,
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
          [players[5].id]: RotationAssignment.Bench,
        }),
        buildRotation(1, {
          [players[0].id]: RotationAssignment.Field,
          [players[1].id]: RotationAssignment.Field,
          [players[2].id]: RotationAssignment.Bench,
          [players[3].id]: RotationAssignment.Field,
          [players[4].id]: RotationAssignment.Field,
          [players[5].id]: RotationAssignment.Bench,
        }),
        buildRotation(2, {
          [players[0].id]: RotationAssignment.Bench,
          [players[1].id]: RotationAssignment.Field,
          [players[2].id]: RotationAssignment.Field,
          [players[3].id]: RotationAssignment.Field,
          [players[4].id]: RotationAssignment.Field,
          [players[5].id]: RotationAssignment.Bench,
        }),
        buildRotation(3, {
          [players[0].id]: RotationAssignment.Field,
          [players[1].id]: RotationAssignment.Bench,
          [players[2].id]: RotationAssignment.Field,
          [players[3].id]: RotationAssignment.Field,
          [players[4].id]: RotationAssignment.Bench,
          [players[5].id]: RotationAssignment.Field,
        }),
        buildRotation(4, {
          [players[0].id]: RotationAssignment.Field,
          [players[1].id]: RotationAssignment.Bench,
          [players[2].id]: RotationAssignment.Bench,
          [players[3].id]: RotationAssignment.Field,
          [players[4].id]: RotationAssignment.Field,
          [players[5].id]: RotationAssignment.Field,
        }),
      ];
      rotations[0].periodIndex = 0;
      rotations[1].periodIndex = 1;
      rotations[2].periodIndex = 2;
      rotations[3].periodIndex = 3;
      rotations[4].periodIndex = 3;

      const schedule = buildSchedule(rotations, players);
      const game: Game = gameFactory.build({
        teamId: team.id,
        rosterId: roster.id,
        gameConfigId: config.id,
        status: 'in-progress',
        startedAt: Date.now(),
        schedule,
        periodDivisions: [1, 1, 1, 2],
        currentRotationIndex: 3,
      });

      const state: AppState = {
        teams: { [team.id]: team },
        games: { [game.id]: game },
      };

      renderGrid(state, game.id);
      await userEvent.click(screen.getByRole('button', { name: /game actions/i }));
      await userEvent.click(screen.getByRole('button', { name: /regenerate/i }));
      const policyDialog = await screen.findByRole('dialog', {
        name: /live regenerate lock policy/i,
      });
      await userEvent.click(within(policyDialog).getByRole('button', { name: /^regenerate$/i }));

      expect(mockSolver.solve).toHaveBeenCalledWith(
        expect.objectContaining({
          config,
          periodDivisions: [1, 1, 1, 2],
          startFromRotation: 3,
          existingRotations: schedule.rotations,
          manualOverrides: [],
          absentPlayerIds: [],
          goalieAssignments: [],
        }),
      );
    });

    it('regenerates from period 3 when period 4 is expanded to four rotations', async () => {
      const players = [
        playerFactory.build({ name: 'A', skillRanking: 5 }),
        playerFactory.build({ name: 'B', skillRanking: 4 }),
        playerFactory.build({ name: 'C', skillRanking: 3 }),
        playerFactory.build({ name: 'D', skillRanking: 2 }),
        playerFactory.build({ name: 'E', skillRanking: 1 }),
        playerFactory.build({ name: 'F', skillRanking: 1 }),
      ];

      const config = gameConfigFactory.build({
        fieldSize: 4,
        periods: 4,
        rotationsPerPeriod: 1,
        useGoalie: false,
        usePositions: false,
        enforceMinPlayTime: true,
        minPlayPercentage: 75,
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
          [players[5].id]: RotationAssignment.Bench,
        }),
        buildRotation(1, {
          [players[0].id]: RotationAssignment.Field,
          [players[1].id]: RotationAssignment.Bench,
          [players[2].id]: RotationAssignment.Field,
          [players[3].id]: RotationAssignment.Field,
          [players[4].id]: RotationAssignment.Field,
          [players[5].id]: RotationAssignment.Bench,
        }),
        buildRotation(2, {
          [players[0].id]: RotationAssignment.Bench,
          [players[1].id]: RotationAssignment.Field,
          [players[2].id]: RotationAssignment.Field,
          [players[3].id]: RotationAssignment.Field,
          [players[4].id]: RotationAssignment.Bench,
          [players[5].id]: RotationAssignment.Field,
        }),
        buildRotation(3, {
          [players[0].id]: RotationAssignment.Field,
          [players[1].id]: RotationAssignment.Bench,
          [players[2].id]: RotationAssignment.Bench,
          [players[3].id]: RotationAssignment.Field,
          [players[4].id]: RotationAssignment.Field,
          [players[5].id]: RotationAssignment.Field,
        }),
        buildRotation(4, {
          [players[0].id]: RotationAssignment.Field,
          [players[1].id]: RotationAssignment.Field,
          [players[2].id]: RotationAssignment.Bench,
          [players[3].id]: RotationAssignment.Bench,
          [players[4].id]: RotationAssignment.Field,
          [players[5].id]: RotationAssignment.Field,
        }),
        buildRotation(5, {
          [players[0].id]: RotationAssignment.Bench,
          [players[1].id]: RotationAssignment.Field,
          [players[2].id]: RotationAssignment.Field,
          [players[3].id]: RotationAssignment.Bench,
          [players[4].id]: RotationAssignment.Field,
          [players[5].id]: RotationAssignment.Field,
        }),
        buildRotation(6, {
          [players[0].id]: RotationAssignment.Field,
          [players[1].id]: RotationAssignment.Field,
          [players[2].id]: RotationAssignment.Field,
          [players[3].id]: RotationAssignment.Bench,
          [players[4].id]: RotationAssignment.Bench,
          [players[5].id]: RotationAssignment.Field,
        }),
      ];
      rotations[0].periodIndex = 0;
      rotations[1].periodIndex = 1;
      rotations[2].periodIndex = 2;
      rotations[3].periodIndex = 3;
      rotations[4].periodIndex = 3;
      rotations[5].periodIndex = 3;
      rotations[6].periodIndex = 3;

      const schedule = buildSchedule(rotations, players);
      const game: Game = gameFactory.build({
        teamId: team.id,
        rosterId: roster.id,
        gameConfigId: config.id,
        status: 'in-progress',
        startedAt: Date.now(),
        schedule,
        periodDivisions: [1, 1, 1, 4],
        currentRotationIndex: 2,
      });

      const state: AppState = {
        teams: { [team.id]: team },
        games: { [game.id]: game },
      };

      renderGrid(state, game.id);
      await userEvent.click(screen.getByRole('button', { name: /game actions/i }));
      await userEvent.click(screen.getByRole('button', { name: /regenerate/i }));
      const policyDialog = await screen.findByRole('dialog', {
        name: /live regenerate lock policy/i,
      });
      await userEvent.click(within(policyDialog).getByRole('button', { name: /^regenerate$/i }));

      expect(mockSolver.solve).toHaveBeenCalledWith(
        expect.objectContaining({
          config,
          periodDivisions: [1, 1, 1, 4],
          startFromRotation: 2,
          existingRotations: schedule.rotations,
          manualOverrides: [],
          absentPlayerIds: [],
          goalieAssignments: [],
        }),
      );
    });

    it('skips live regenerate preview when solver output has no modified cells', async () => {
      const { state, game } = buildLiveState();
      const { dispatch } = renderGrid(state, game.id);
      mockSolver.solve = vi.fn(() => {
        mockSolver.result = game.schedule;
      });

      await userEvent.click(screen.getByRole('button', { name: /game actions/i }));
      await userEvent.click(screen.getByRole('button', { name: /regenerate/i }));
      const policyDialog = await screen.findByRole('dialog', {
        name: /live regenerate lock policy/i,
      });
      await userEvent.click(within(policyDialog).getByRole('button', { name: /^regenerate$/i }));

      await waitFor(() => {
        expect(screen.queryByText('Review Regenerated Rotations')).not.toBeInTheDocument();
      });
      expect(dispatch).not.toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'SET_GAME_SCHEDULE',
        }),
      );
    });

    it('does not treat bench field-position metadata as a preview diff', async () => {
      const { state, game, team, config } = buildLiveState();
      const { dispatch } = renderGrid(
        {
          ...state,
          teams: {
            ...state.teams,
            [team.id]: {
              ...team,
              gameConfigs: team.gameConfigs.map((existing) =>
                existing.id === config.id ? { ...existing, usePositions: true } : existing,
              ),
            },
          },
        },
        game.id,
      );
      const schedule = game.schedule!;
      const targetRotation = schedule.rotations[game.currentRotationIndex];
      const benchPlayerId = Object.entries(targetRotation.assignments).find(
        ([, assignment]) => assignment === RotationAssignment.Bench,
      )?.[0];
      if (!benchPlayerId) throw new Error('Expected a benched player in current rotation');

      const metadataOnlySchedule = {
        ...schedule,
        rotations: schedule.rotations.map((rotation) =>
          rotation.index === targetRotation.index
            ? {
                ...rotation,
                fieldPositions: {
                  ...(rotation.fieldPositions ?? {}),
                  [benchPlayerId]: 'CM',
                },
              }
            : rotation,
        ),
      };

      mockSolver.solve = vi.fn(() => {
        mockSolver.result = metadataOnlySchedule;
      });

      await userEvent.click(screen.getByRole('button', { name: /game actions/i }));
      await userEvent.click(screen.getByRole('button', { name: /regenerate/i }));
      const policyDialog = await screen.findByRole('dialog', {
        name: /live regenerate lock policy/i,
      });
      await userEvent.click(within(policyDialog).getByRole('button', { name: /^regenerate$/i }));

      await waitFor(() => {
        expect(screen.queryByText('Review Regenerated Rotations')).not.toBeInTheDocument();
      });
      expect(dispatch).not.toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'SET_GAME_SCHEDULE',
        }),
      );
    });

    it('does not treat missing bench assignment keys as a preview diff', async () => {
      const { state, game } = buildLiveState();
      const { dispatch } = renderGrid(state, game.id);
      const schedule = game.schedule!;
      const targetRotation = schedule.rotations[game.currentRotationIndex];
      const benchPlayerId = Object.entries(targetRotation.assignments).find(
        ([, assignment]) => assignment === RotationAssignment.Bench,
      )?.[0];
      if (!benchPlayerId) throw new Error('Expected a benched player in current rotation');

      const normalizedSchedule = {
        ...schedule,
        rotations: schedule.rotations.map((rotation) => {
          if (rotation.index !== targetRotation.index) return rotation;
          const assignments = { ...rotation.assignments };
          delete assignments[benchPlayerId];
          return { ...rotation, assignments };
        }),
      };

      mockSolver.solve = vi.fn(() => {
        mockSolver.result = normalizedSchedule;
      });

      await userEvent.click(screen.getByRole('button', { name: /game actions/i }));
      await userEvent.click(screen.getByRole('button', { name: /regenerate/i }));
      const policyDialog = await screen.findByRole('dialog', {
        name: /live regenerate lock policy/i,
      });
      await userEvent.click(within(policyDialog).getByRole('button', { name: /^regenerate$/i }));

      await waitFor(() => {
        expect(screen.queryByText('Review Regenerated Rotations')).not.toBeInTheDocument();
      });
      expect(dispatch).not.toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'SET_GAME_SCHEDULE',
        }),
      );
    });

    it('skips preview when added rotations match prior period values', async () => {
      const { state, game } = buildLiveState();
      const { dispatch } = renderGrid(state, game.id);
      const schedule = game.schedule!;
      const newRotationAssignments = {
        ...schedule.rotations[schedule.rotations.length - 1].assignments,
      };
      const newRotation = buildRotation(schedule.rotations.length, newRotationAssignments);
      newRotation.periodIndex = schedule.rotations[schedule.rotations.length - 1].periodIndex;
      const previewWithExtraRotation = {
        ...schedule,
        rotations: [...schedule.rotations, newRotation],
      };

      mockSolver.solve = vi.fn(() => {
        mockSolver.result = previewWithExtraRotation;
      });

      await userEvent.click(screen.getByRole('button', { name: /game actions/i }));
      await userEvent.click(screen.getByRole('button', { name: /regenerate/i }));
      const policyDialog = await screen.findByRole('dialog', {
        name: /live regenerate lock policy/i,
      });
      await userEvent.click(within(policyDialog).getByRole('button', { name: /^regenerate$/i }));

      await waitFor(() => {
        expect(screen.queryByText('Review Regenerated Rotations')).not.toBeInTheDocument();
      });
      expect(dispatch).not.toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'SET_GAME_SCHEDULE',
        }),
      );
    });

    it('compares added split cells against prior period values (no dash baseline)', async () => {
      const { state, game } = buildLiveState();
      renderGrid(state, game.id);
      const schedule = game.schedule!;
      const baseRotation = schedule.rotations[schedule.rotations.length - 1];
      const fieldPlayerId = Object.entries(baseRotation.assignments).find(
        ([, assignment]) => assignment === RotationAssignment.Field,
      )?.[0];
      const benchPlayerId = Object.entries(baseRotation.assignments).find(
        ([, assignment]) => assignment === RotationAssignment.Bench,
      )?.[0];
      if (!fieldPlayerId || !benchPlayerId) throw new Error('Expected field and bench players');
      const newRotation = buildRotation(schedule.rotations.length, {
        ...baseRotation.assignments,
        [fieldPlayerId]: RotationAssignment.Bench,
        [benchPlayerId]: RotationAssignment.Field,
      });
      newRotation.periodIndex = baseRotation.periodIndex;
      const previewSchedule = {
        ...schedule,
        rotations: [...schedule.rotations, newRotation],
      };

      mockSolver.solve = vi.fn(() => {
        mockSolver.result = previewSchedule;
      });

      await userEvent.click(screen.getByRole('button', { name: /game actions/i }));
      await userEvent.click(screen.getByRole('button', { name: /regenerate/i }));
      const policyDialog = await screen.findByRole('dialog', {
        name: /live regenerate lock policy/i,
      });
      await userEvent.click(within(policyDialog).getByRole('button', { name: /^regenerate$/i }));

      const previewDialog = await screen.findByRole('dialog', {
        name: /review regenerated rotations/i,
      });
      expect(previewDialog).not.toHaveTextContent(/-\s*→/);
      expect(previewDialog).toHaveTextContent(/●\s*→\s*○/);
      expect(previewDialog).toHaveTextContent(/○\s*→\s*●/);
    });

    it('highlights changed cells in regenerate preview grid', async () => {
      const { state, game } = buildLiveState();
      renderGrid(state, game.id);

      const schedule = game.schedule!;
      const targetRotationIndex = game.currentRotationIndex;
      const targetRotation = schedule.rotations[targetRotationIndex];
      const fieldEntry = Object.entries(targetRotation.assignments).find(
        ([, assignment]) => assignment === RotationAssignment.Field,
      );
      const benchEntry = Object.entries(targetRotation.assignments).find(
        ([, assignment]) => assignment === RotationAssignment.Bench,
      );
      if (!fieldEntry || !benchEntry) throw new Error('Expected both field and bench assignments');

      const [fieldPlayerId] = fieldEntry;
      const [benchPlayerId] = benchEntry;
      const changedSchedule = {
        ...schedule,
        rotations: schedule.rotations.map((rotation) =>
          rotation.index === targetRotationIndex
            ? {
                ...rotation,
                assignments: {
                  ...rotation.assignments,
                  [fieldPlayerId]: RotationAssignment.Bench,
                  [benchPlayerId]: RotationAssignment.Field,
                },
              }
            : rotation,
        ),
      };

      mockSolver.solve = vi.fn(() => {
        mockSolver.result = changedSchedule;
      });

      await userEvent.click(screen.getByRole('button', { name: /game actions/i }));
      await userEvent.click(screen.getByRole('button', { name: /regenerate/i }));
      const policyDialog = await screen.findByRole('dialog', {
        name: /live regenerate lock policy/i,
      });
      await userEvent.click(within(policyDialog).getByRole('button', { name: /^regenerate$/i }));

      const previewDialog = await screen.findByRole('dialog', {
        name: /review regenerated rotations/i,
      });
      expect(
        within(previewDialog).getByText(
          /Highlighted cells show before → after changes in this preview\./i,
        ),
      ).toBeInTheDocument();
      expect(previewDialog.querySelectorAll('[data-preview-change="changed"]').length).toBe(2);
      expect(previewDialog).toHaveTextContent(/●\s*→\s*○/);
      expect(previewDialog).toHaveTextContent(/○\s*→\s*●/);
    });

    it('applies the live regenerate preview when confirmed', async () => {
      const { state, game } = buildLiveState();
      const { dispatch } = renderGrid(state, game.id);
      const schedule = game.schedule!;
      const targetRotationIndex = game.currentRotationIndex;
      const targetRotation = schedule.rotations[targetRotationIndex];
      const fieldEntry = Object.entries(targetRotation.assignments).find(
        ([, assignment]) => assignment === RotationAssignment.Field,
      );
      const benchEntry = Object.entries(targetRotation.assignments).find(
        ([, assignment]) => assignment === RotationAssignment.Bench,
      );
      if (!fieldEntry || !benchEntry) throw new Error('Expected both field and bench assignments');
      const [fieldPlayerId] = fieldEntry;
      const [benchPlayerId] = benchEntry;
      const changedSchedule = {
        ...schedule,
        rotations: schedule.rotations.map((rotation) =>
          rotation.index === targetRotationIndex
            ? {
                ...rotation,
                assignments: {
                  ...rotation.assignments,
                  [fieldPlayerId]: RotationAssignment.Bench,
                  [benchPlayerId]: RotationAssignment.Field,
                },
              }
            : rotation,
        ),
      };
      mockSolver.solve = vi.fn(() => {
        mockSolver.result = changedSchedule;
      });

      await userEvent.click(screen.getByRole('button', { name: /game actions/i }));
      await userEvent.click(screen.getByRole('button', { name: /regenerate/i }));
      const policyDialog = await screen.findByRole('dialog', {
        name: /live regenerate lock policy/i,
      });
      await userEvent.click(within(policyDialog).getByRole('button', { name: /^regenerate$/i }));

      expect(await screen.findByText('Review Regenerated Rotations')).toBeInTheDocument();
      await userEvent.click(screen.getByRole('button', { name: /apply regenerate/i }));

      expect(dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'SET_GAME_SCHEDULE',
          payload: expect.objectContaining({
            gameId: game.id,
          }),
        }),
      );
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
    it('selects a cell for swap on click', async () => {
      const { state, game } = buildTestState();
      const { container } = renderGrid(state, game.id);

      // Labels are "●" (field) and "○" (bench) when usePositions is false
      const fieldBadges = screen.getAllByText('●');
      await userEvent.click(fieldBadges[0]);

      // Selected cell gets pulse animation
      expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
    });

    it('deselects when same cell is clicked again', async () => {
      const { state, game } = buildTestState();
      const { container } = renderGrid(state, game.id);

      const fieldBadges = screen.getAllByText('●');
      await userEvent.click(fieldBadges[0]);
      expect(container.querySelector('.animate-pulse')).toBeInTheDocument();

      // Click same badge again to deselect
      await userEvent.click(fieldBadges[0]);
      expect(container.querySelector('.animate-pulse')).not.toBeInTheDocument();
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
      // Target specific rotation cells to avoid relying on table column collapse defaults.
      await userEvent.click(screen.getByLabelText(/Alice: .*rotation 1/i));
      await userEvent.click(screen.getByLabelText(/Bob: .*rotation 1/i));

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

    it('disables actions for the current period at game start', async () => {
      const { state, game } = buildLiveState();
      renderGrid(state, game.id);
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
