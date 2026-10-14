import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import PageTransition from '@/components/PageTransition';

vi.mock('@/lib/shelveAnimation', () => ({ peekPendingShelve: () => null }));

describe('Page transition containment', () => {
  it('releases the animated wrapper only when its own entry ends', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/home']}>
        <PageTransition><span>Page content</span></PageTransition>
      </MemoryRouter>,
    );
    const wrapper = container.firstElementChild;
    expect(wrapper).toHaveClass('page-transition');
    fireEvent.animationEnd(screen.getByText('Page content'));
    expect(wrapper).toHaveClass('page-transition');
    if (!wrapper) throw new Error('Missing page wrapper');
    fireEvent.animationEnd(wrapper);
    expect(wrapper).not.toHaveClass('page-transition');
  });
});