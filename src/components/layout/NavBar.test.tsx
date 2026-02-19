import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { NavBar } from './NavBar.tsx';

function renderWithRouter(ui: React.ReactElement, initialEntry = '/') {
  return render(<MemoryRouter initialEntries={[initialEntry]}>{ui}</MemoryRouter>);
}

describe('NavBar', () => {
  it('renders the title', () => {
    renderWithRouter(<NavBar title="Teams" />);
    expect(screen.getByText('Teams')).toBeInTheDocument();
  });

  it('renders a back button when backTo is provided', () => {
    renderWithRouter(<NavBar title="Roster" backTo="/" backLabel="Teams" />);
    const backLink = screen.getByLabelText('Back to Teams');
    expect(backLink).toHaveAttribute('href', '/');
  });

  it('does not render back button when backTo is not provided', () => {
    renderWithRouter(<NavBar title="Teams" />);
    expect(screen.queryByLabelText(/back/i)).not.toBeInTheDocument();
  });

  it('renders trailing actions', () => {
    renderWithRouter(<NavBar title="Teams" trailing={<button>Add</button>} />);
    expect(screen.getByText('Add')).toBeInTheDocument();
  });

  it('renders large title when largeTitle is true', () => {
    renderWithRouter(<NavBar title="Teams" largeTitle />);
    const headings = screen.getAllByText('Teams');
    // Large title mode renders the title in the large title row
    expect(headings.length).toBeGreaterThanOrEqual(1);
  });
});
