import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { UserAvatar } from '@/components/chat/UserAvatar';

describe('UserAvatar', () => {
  it('renders initials from first and last name', () => {
    render(<UserAvatar user={{ displayName: 'Joao Silva', avatarUrl: null }} />);
    expect(screen.getByText('JS')).toBeInTheDocument();
  });

  it('renders a single initial for a one-word name', () => {
    render(<UserAvatar user={{ displayName: 'Cher', avatarUrl: null }} />);
    expect(screen.getByText('C')).toBeInTheDocument();
  });

  it('renders an image when avatarUrl is set', () => {
    const { container } = render(
      <UserAvatar user={{ displayName: 'Joao Silva', avatarUrl: 'https://example.com/a.png' }} />,
    );
    const img = container.querySelector('img');
    expect(img).toHaveAttribute('src', 'https://example.com/a.png');
    expect(screen.queryByText('JS')).not.toBeInTheDocument();
  });
});
