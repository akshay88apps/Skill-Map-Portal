import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ExperienceDurationField } from '@/app/my-profile/page';
import {
  canonicalExperienceDuration,
  isExperienceDuration,
} from '@/lib/experience';
import { profileInput } from '@/lib/validation';

describe('total relevant experience', () => {
  it('renders mandatory year and month ranges and emits a canonical value', () => {
    const onChange = vi.fn();
    render(<ExperienceDurationField onChange={onChange} />);

    const years = screen.getByLabelText('Total relevant experience years');
    const months = screen.getByLabelText('Total relevant experience months');
    expect(years).toBeRequired();
    expect(months).toBeRequired();
    expect(years.querySelectorAll('option')).toHaveLength(42);
    expect(months.querySelectorAll('option')).toHaveLength(14);

    fireEvent.change(years, { target: { value: '16' } });
    fireEvent.change(months, { target: { value: '6' } });
    expect(onChange).toHaveBeenLastCalledWith('16 years 6 months');
  });

  it('converts legacy whole-year drafts', () => {
    expect(canonicalExperienceDuration('16')).toBe('16 years 0 months');
    expect(canonicalExperienceDuration('10+')).toBe('10 years 0 months');
  });

  it('requires a bounded duration on profile submission', () => {
    const base = {
      fullName: 'Test Leader',
      ratedSkills: [],
      careerAspiration: {
        targetRole: 'Engineering Lead',
        targetSkills: [{ name: 'Azure Functions', targetProficiency: 4 }],
        targetTimeframe: 'SIX_TO_TWELVE_MONTHS',
      },
    };
    expect(profileInput.safeParse(base).success).toBe(false);
    expect(
      profileInput.safeParse({ ...base, experience: '40 years 12 months' })
        .success,
    ).toBe(true);
    expect(isExperienceDuration('41 years 0 months')).toBe(false);
    expect(isExperienceDuration('40 years 13 months')).toBe(false);
  });
});
