import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from './App';

describe('App', () => {
  it('renders the portal title', () => {
    render(<App />);
    expect(screen.getAllByText(/Document Knowledge Portal/i).length).toBeGreaterThan(0);
  });
});
