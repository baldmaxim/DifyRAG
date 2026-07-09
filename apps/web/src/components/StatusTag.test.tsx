import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StatusTag } from './StatusTag';

describe('StatusTag', () => {
  it('renders the Russian label for a known status', () => {
    render(<StatusTag status="indexed" />);
    expect(screen.getByText('Индексирован')).toBeInTheDocument();
  });

  it('renders an error status', () => {
    render(<StatusTag status="error" />);
    expect(screen.getByText('Ошибка')).toBeInTheDocument();
  });

  it('falls back to the raw value for unknown statuses', () => {
    render(<StatusTag status="totally-unknown" />);
    expect(screen.getByText('totally-unknown')).toBeInTheDocument();
  });
});
