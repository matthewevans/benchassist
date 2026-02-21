import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AppProvider } from '@/context/AppContext.tsx';
import { Practice } from '@/pages/Practice.tsx';

function renderPractice(route = '/practice') {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <AppProvider>
        <Practice />
      </AppProvider>
    </MemoryRouter>,
  );
}

/** Returns the "Focus Areas" section container (the category chips area). */
function getFocusAreasSection() {
  const heading = screen.getByText('Focus Areas');
  return heading.closest('section')!;
}

describe('Practice page', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  it('renders the page heading', () => {
    renderPractice();
    expect(screen.getByText('Practice')).toBeInTheDocument();
  });

  it('shows empty state when no birth year is selected', () => {
    renderPractice();
    expect(screen.getByText('Select a birth year to get started')).toBeInTheDocument();
  });

  it('shows category chips after entering a birth year', async () => {
    const user = userEvent.setup();
    renderPractice();
    const input = screen.getByPlaceholderText('Birth year');
    await user.clear(input);
    await user.type(input, '2016');
    expect(screen.getByText('Focus Areas')).toBeInTheDocument();
    // Category chip buttons should appear
    const section = getFocusAreasSection();
    expect(within(section).getByRole('button', { name: 'Passing' })).toBeInTheDocument();
    expect(within(section).getByRole('button', { name: 'Dribbling' })).toBeInTheDocument();
  });

  it('shows category chips when clicking a U-age chip', async () => {
    const user = userEvent.setup();
    renderPractice();
    await user.click(screen.getByRole('button', { name: 'U10' }));
    expect(screen.getByText('Focus Areas')).toBeInTheDocument();
    const section = getFocusAreasSection();
    expect(within(section).getByRole('button', { name: 'Passing' })).toBeInTheDocument();
    expect(within(section).getByRole('button', { name: 'Dribbling' })).toBeInTheDocument();
  });

  it('generates a plan when categories are selected', async () => {
    const user = userEvent.setup();
    renderPractice();
    await user.click(screen.getByRole('button', { name: 'U10' }));
    const section = getFocusAreasSection();
    await user.click(within(section).getByRole('button', { name: 'Passing' }));
    expect(screen.getByText(/Practice Plan/)).toBeInTheDocument();
  });

  it('hides tactical categories for young age brackets (U6)', async () => {
    const user = userEvent.setup();
    renderPractice();
    await user.click(screen.getByRole('button', { name: 'U6' }));
    const section = getFocusAreasSection();
    // Tactical categories should NOT be present as buttons
    expect(within(section).queryByRole('button', { name: 'Attacking' })).not.toBeInTheDocument();
    expect(within(section).queryByRole('button', { name: 'Defending' })).not.toBeInTheDocument();
    expect(within(section).queryByRole('button', { name: 'Possession' })).not.toBeInTheDocument();
    expect(within(section).queryByRole('button', { name: 'Transition' })).not.toBeInTheDocument();
    expect(within(section).queryByRole('button', { name: 'Set Pieces' })).not.toBeInTheDocument();
    // Technical categories should be visible
    expect(within(section).getByRole('button', { name: 'Dribbling' })).toBeInTheDocument();
    expect(within(section).getByRole('button', { name: 'Shooting' })).toBeInTheDocument();
    expect(within(section).getByRole('button', { name: 'First Touch' })).toBeInTheDocument();
  });

  it('hides tactical categories for U8 bracket', async () => {
    const user = userEvent.setup();
    renderPractice();
    await user.click(screen.getByRole('button', { name: 'U8' }));
    const section = getFocusAreasSection();
    expect(within(section).queryByRole('button', { name: 'Attacking' })).not.toBeInTheDocument();
    expect(within(section).queryByRole('button', { name: 'Defending' })).not.toBeInTheDocument();
    expect(within(section).getByRole('button', { name: 'Dribbling' })).toBeInTheDocument();
  });

  it('hides tactical categories for U10 bracket', async () => {
    const user = userEvent.setup();
    renderPractice();
    await user.click(screen.getByRole('button', { name: 'U10' }));
    const section = getFocusAreasSection();
    expect(within(section).queryByRole('button', { name: 'Attacking' })).not.toBeInTheDocument();
    expect(within(section).queryByRole('button', { name: 'Defending' })).not.toBeInTheDocument();
    expect(within(section).getByRole('button', { name: 'Passing' })).toBeInTheDocument();
  });

  it('shows all categories including tactical for U12+', async () => {
    const user = userEvent.setup();
    renderPractice();
    await user.click(screen.getByRole('button', { name: 'U12' }));
    const section = getFocusAreasSection();
    expect(within(section).getByRole('button', { name: 'Passing' })).toBeInTheDocument();
    expect(within(section).getByRole('button', { name: 'Dribbling' })).toBeInTheDocument();
    expect(within(section).getByRole('button', { name: 'Attacking' })).toBeInTheDocument();
    expect(within(section).getByRole('button', { name: 'Defending' })).toBeInTheDocument();
    expect(within(section).getByRole('button', { name: 'Possession' })).toBeInTheDocument();
    expect(within(section).getByRole('button', { name: 'Transition' })).toBeInTheDocument();
    expect(within(section).getByRole('button', { name: 'Set Pieces' })).toBeInTheDocument();
  });

  it('shows Shuffle All button when a plan is generated', async () => {
    const user = userEvent.setup();
    renderPractice();
    await user.click(screen.getByRole('button', { name: 'U10' }));
    const section = getFocusAreasSection();
    await user.click(within(section).getByRole('button', { name: 'Passing' }));
    expect(screen.getByRole('button', { name: 'Shuffle All' })).toBeInTheDocument();
  });

  it('shows browse drills when age is set but no category selected', async () => {
    const user = userEvent.setup();
    renderPractice();
    await user.click(screen.getByRole('button', { name: 'U12' }));
    // Browse mode shows phase headings
    expect(screen.getByRole('heading', { name: 'Warm-up' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Main' })).toBeInTheDocument();
  });

  it('removes empty state card after entering a birth year', async () => {
    const user = userEvent.setup();
    renderPractice();
    expect(screen.getByText('Select a birth year to get started')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'U10' }));
    expect(screen.queryByText('Select a birth year to get started')).not.toBeInTheDocument();
  });

  it('toggles a category off when clicked again', async () => {
    const user = userEvent.setup();
    renderPractice();
    await user.click(screen.getByRole('button', { name: 'U10' }));
    const section = getFocusAreasSection();
    // Select passing
    await user.click(within(section).getByRole('button', { name: 'Passing' }));
    expect(screen.getByText(/Practice Plan/)).toBeInTheDocument();
    // Deselect passing -- the button still exists (now it's in the plan view too,
    // but the Focus Areas section button is still there)
    await user.click(within(section).getByRole('button', { name: 'Passing' }));
    // Plan should disappear, browse mode should show
    expect(screen.queryByText(/Practice Plan/)).not.toBeInTheDocument();
  });

  it('shows settings controls (players and duration)', () => {
    renderPractice();
    expect(screen.getByText('Players')).toBeInTheDocument();
    expect(screen.getByText('Duration')).toBeInTheDocument();
  });

  it('shows Favorites only toggle', () => {
    renderPractice();
    expect(screen.getByText('Favorites only')).toBeInTheDocument();
  });

  it('shows phase-colored dots on drill cards when plan is generated', async () => {
    const user = userEvent.setup();
    renderPractice();
    await user.click(screen.getByRole('button', { name: 'U10' }));
    const section = getFocusAreasSection();
    await user.click(within(section).getByRole('button', { name: 'Passing' }));
    // Cards should be rendered (bg-card divs with rounded corners)
    const cards = document.querySelectorAll('.bg-card.rounded-\\[10px\\]');
    expect(cards.length).toBeGreaterThanOrEqual(3);
    // At least one card should have a phase dot
    const hasPhaseDot = Array.from(cards).some((c) => {
      const dot = c.querySelector('.bg-amber-400, .bg-blue-400, .bg-emerald-400, .bg-slate-400');
      return dot !== null;
    });
    expect(hasPhaseDot).toBe(true);
  });

  it('shows intensity badges on drill cards', async () => {
    const user = userEvent.setup();
    renderPractice();
    await user.click(screen.getByRole('button', { name: 'U10' }));
    const section = getFocusAreasSection();
    await user.click(within(section).getByRole('button', { name: 'Passing' }));
    // Should see at least one intensity label (Low, Med, or High)
    const intensityLabels = [
      ...screen.queryAllByText('Low'),
      ...screen.queryAllByText('Med'),
      ...screen.queryAllByText('High'),
    ];
    expect(intensityLabels.length).toBeGreaterThan(0);
  });
});
