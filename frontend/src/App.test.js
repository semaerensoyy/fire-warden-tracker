import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App';

test('renders Fire Warden Tracker header', () => {
  render(
    <MemoryRouter>
      <App />
    </MemoryRouter>
  );
  // Look for the header text "Fire Warden Tracker"
  const headerElement = screen.getByText(/fire warden tracker/i);
  expect(headerElement).toBeInTheDocument();
});
