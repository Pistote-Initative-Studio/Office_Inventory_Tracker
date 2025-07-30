import { render, screen } from '@testing-library/react';
import App from './App';

beforeEach(() => {
  localStorage.setItem('token', 'test');
});

afterEach(() => {
  localStorage.clear();
});

test('renders supply manager heading', () => {
  render(<App />);
  const heading = screen.getByText(/office supply manager/i);
  expect(heading).toBeInTheDocument();
});
