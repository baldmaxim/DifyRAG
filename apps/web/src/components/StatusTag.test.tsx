import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StatusTag } from './StatusTag';

describe('StatusTag', () => {
  it('renders the status text', () => {
    render(<StatusTag status="indexed" />);
    expect(screen.getByText('indexed')).toBeInTheDocument();
  });

  it('renders an error status', () => {
    render(<StatusTag status="error" />);
    expect(screen.getByText('error')).toBeInTheDocument();
  });
});
