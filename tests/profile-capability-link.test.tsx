import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Wizard from '@/app/my-profile/page';

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({ ok: false }),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('profile capability-map reference', () => {
  it('opens the Overview reference from Basic Info and Skills', () => {
    render(<Wizard />);

    const basicInfoLink = screen.getByRole('link', {
      name: /How this works: view the capability map/,
    });
    expect(basicInfoLink).toHaveAttribute('href', '/#capability-map');
    expect(basicInfoLink).toHaveAttribute('target', '_blank');

    fireEvent.click(screen.getByRole('button', { name: /Skills$/ }));
    const skillsLink = screen.getByRole('link', {
      name: /How this works: view the capability map/,
    });
    expect(skillsLink).toHaveAttribute('href', '/#capability-map');
    expect(skillsLink).toHaveAttribute('target', '_blank');
  });
});
