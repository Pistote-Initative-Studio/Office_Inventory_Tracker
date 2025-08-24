import { render, screen } from '@testing-library/react';
import App from './App';

beforeEach(() => {
  localStorage.setItem('token', 'test');
});

afterEach(() => {
  localStorage.clear();
});

test('renders inventory manager heading', () => {
  render(<App />);
  const heading = screen.getByText(/inventory manager/i);
  expect(heading).toBeInTheDocument();
});
