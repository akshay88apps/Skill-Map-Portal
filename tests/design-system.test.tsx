import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  Button,
  Empty,
  PanelHeader,
  RoleBadge,
  StatusBadge,
} from '@/components/ui';

describe('shared enterprise UI contracts', () => {
  it('renders the governed button variants from shared classes', () => {
    render(
      <div>
        <Button>Save</Button>
        <Button variant="secondary">Cancel</Button>
        <Button variant="destructive">Deactivate</Button>
        <Button variant="ghost">Details</Button>
      </div>,
    );

    expect(screen.getByRole('button', { name: 'Save' })).toHaveClass('btn');
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveClass(
      'btn-secondary',
    );
    expect(screen.getByRole('button', { name: 'Deactivate' })).toHaveClass(
      'btn-destructive',
    );
    expect(screen.getByRole('button', { name: 'Details' })).toHaveClass(
      'btn-ghost',
    );
  });

  it('normalizes role and workflow labels through shared badges', () => {
    render(
      <div>
        <RoleBadge role="ADMIN" />
        <StatusBadge status="PUBLISHED" />
        <StatusBadge status="DEACTIVATED" />
      </div>,
    );

    expect(screen.getByText('Admin')).toHaveClass('text-info-700');
    expect(screen.getByText('Published')).toHaveClass('text-success-700');
    expect(screen.getByText('Deactivated')).toHaveClass('text-error-700');
  });

  it('keeps panel and empty-state hierarchy in reusable components', () => {
    render(
      <div>
        <PanelHeader
          eyebrow="Governance"
          title="Review queue"
          description="Review pending records."
        />
        <Empty
          title="Nothing pending"
          body="All records have been reviewed."
          href="/admin"
          label="Return to administration"
        />
      </div>,
    );

    expect(
      screen.getByRole('heading', { name: 'Review queue' }),
    ).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Nothing pending' })).toBeVisible();
    expect(
      screen.getByRole('link', { name: 'Return to administration' }),
    ).toHaveClass('btn-secondary');
  });
});
