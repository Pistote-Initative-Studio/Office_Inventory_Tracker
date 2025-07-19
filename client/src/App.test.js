import { render, screen } from '@testing-library/react';
import App from './App';

test('renders inventory tracker heading', () => {
  render(<App />);
  const heading = screen.getByText(/office inventory tracker/i);
  expect(heading).toBeInTheDocument();
});
