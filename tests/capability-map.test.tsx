import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { CapabilityMap } from '@/components/capability-map';
import {
  capabilityMappingConfig,
} from '@/lib/capabilities';

afterEach(cleanup);

describe('Overview capability map', () => {
  it('renders all ten configured capabilities in the shared mapping order', () => {
    render(<CapabilityMap />);

    const bodyRows = screen.getAllByRole('row').slice(1);
    expect(bodyRows).toHaveLength(10);
    expect(
      bodyRows.map((row) => within(row).getByRole('rowheader').textContent),
    ).toEqual([
      'AI & Autonomous Systems',
      'Data Platforms & Intelligence',
      'Platform Engineering',
      'Product Engineering',
      'Experience Engineering',
      'Enterprise Platforms',
      'Digital Trust',
      'Customer Engineering',
      'Innovation Lab',
      'Product Strategy & Venture Studio',
    ]);
    expect(screen.getByText('10 capabilities, 14 skill categories', { exact: false }))
      .toBeVisible();
    expect(
      screen.getByText('DevOps & Cloud Engineering (incl. IAM)'),
    ).toBeVisible();
    expect(
      screen.getByText(
        'From your selected skills — new practice area, still building bench',
      ),
    ).toBeVisible();
    expect(screen.getAllByText('Tagged by HR/Admin')).toHaveLength(3);
    expect(screen.getAllByText('— (role-based, not skill-based)')).toHaveLength(
      3,
    );
  });

  it('renders a category added to the underlying mapping without UI changes', () => {
    const changedConfig = {
      ...capabilityMappingConfig,
      categoryToCapability: {
        ...capabilityMappingConfig.categoryToCapability,
        Observability: 'Platform Engineering',
      },
    };

    render(<CapabilityMap config={changedConfig} />);

    const platformRow = screen
      .getByRole('rowheader', { name: 'Platform Engineering' })
      .closest('tr');
    expect(platformRow).not.toBeNull();
    expect(within(platformRow!).getByText(/Observability/)).toBeVisible();
    expect(
      screen.getByText('10 capabilities, 15 skill categories', { exact: false }),
    ).toBeVisible();
  });
});
