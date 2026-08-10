import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DepartmentField } from '@/app/my-profile/page';
import { departmentOptions } from '@/lib/departments';
import { profileDraftInput, profileInput } from '@/lib/validation';

describe('profile department selection', () => {
  it('offers only the governed department list', () => {
    const onChange = vi.fn();
    render(
      <DepartmentField label="Department" value="" onChange={onChange} />,
    );

    const select = screen.getByRole('combobox', { name: 'Department' });
    const offeredValues = screen
      .getAllByRole('option')
      .map((option) => (option as HTMLOptionElement).value)
      .filter(Boolean);

    expect(offeredValues).toEqual(departmentOptions);
    fireEvent.change(select, { target: { value: 'Digital Trust' } });
    expect(onChange).toHaveBeenCalledWith('Digital Trust');
  });

  it('enforces the same list for drafts and final submissions', () => {
    expect(
      profileDraftInput.safeParse({ department: 'Innovation Lab' }).success,
    ).toBe(true);
    expect(
      profileDraftInput.safeParse({ department: 'Uncontrolled Department' })
        .success,
    ).toBe(false);
    expect(profileDraftInput.parse({ department: '' }).department).toBeUndefined();
    expect(
      profileInput.safeParse({
        fullName: 'Test Leader',
        department: 'Product Engineering',
        experience: '10 years 0 months',
        ratedSkills: [],
      }).success,
    ).toBe(true);
    expect(
      profileInput.safeParse({
        fullName: 'Test Leader',
        department: 'Engineering',
        experience: '10 years 0 months',
        ratedSkills: [],
      }).success,
    ).toBe(false);
  });
});
